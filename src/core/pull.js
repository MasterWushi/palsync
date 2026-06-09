"use strict";
// Headless pull: resolve fresh id by GUID -> getPal(id) -> SYNC the server pal to disk.
//
// SYNC, NOT WIPE. The 13 manifest folders (pages, fragments, scripts, styles, …) are
// pull-managed: their contents are replaced with the server state, and files that no longer
// exist on the server are removed. Everything ELSE in the workspace — files at the root
// (spec.md, notes, the palsync-managed .palsync.json / CLAUDE.md / .claude/), user-created
// subdirs (references/, docs/) — is left ALONE. This is the symmetric-with-git-pull contract:
// pull touches only the files it manages.
//
// Datasets/dataviews/data/datalists are JSON passthrough — written verbatim, never created or
// altered semantically. Only the 9 base64 "content" types are decoded to files (and then
// blanked in pal.json by clearContent, exactly like the extension).
const fs = require("fs/promises");
const path = require("path");
const { CloudPistonAPIManager } = require("../../lib/apiManager");
const { Pal } = require("../../lib/pal");
const { resolveServerPalByGuid } = require("./resolve");

// The 13 manifest folders pull manages. Files INSIDE these are pull-owned and may be deleted
// as stale; anything outside is left alone.
const ALL_FOLDERS = [
    "data", "datalists", "datasets", "dataviews",
    "attachments", "documents", "emails", "fragments",
    "images", "pages", "scripts", "styles", "workflows"
];

// JSON-based entry types: [getter, entry sub-key, folder]
const JSON_TYPES = [
    ["allData", "Data", "data"],
    ["allDatalists", "DataList", "datalists"],
    ["allDatasets", "Dataset", "datasets"],
    ["allDataviews", "Dataview", "dataviews"]
];

// Base64-based ("content") entry types: [getter, entry sub-key, folder]
const BASE64_TYPES = [
    ["allAttachments", "Attachment", "attachments"],
    ["allDocuments", "Document", "documents"],
    ["allEmails", "Email", "emails"],
    ["allFragments", "Fragment", "fragments"],
    ["allImages", "Image", "images"],
    ["allPages", "Page", "pages"],
    ["allScripts", "Script", "scripts"],
    ["allStyles", "Style", "styles"],
    ["allWorkflows", "Workflow", "workflows"]
];

// Compute the set of POSIX-style relative paths the current server manifest will write into
// the workspace (everything inside the 13 manifest folders). Exposed for tests/diagnostics.
function manifestPaths(pal) {
    const out = new Set();
    for (const [getter, , folder] of JSON_TYPES) {
        for (const entry of pal[getter]) out.add(folder + "/" + entry.string + ".json");
    }
    for (const [getter, , folder] of BASE64_TYPES) {
        for (const entry of pal[getter]) out.add(folder + "/" + entry.string);
    }
    return out;
}

// List every file currently under the 13 manifest folders (recursive, files only). Returns
// POSIX-style relative paths so equality with manifestPaths() comparison is straightforward.
async function listTrackedFiles(targetDir) {
    const out = [];
    async function walk(dirAbs, relBase) {
        let entries;
        try { entries = await fs.readdir(dirAbs, { withFileTypes: true }); }
        catch (e) { if (e.code === "ENOENT") return; throw e; }
        for (const e of entries) {
            const childAbs = path.join(dirAbs, e.name);
            const childRel = relBase ? relBase + "/" + e.name : e.name;
            if (e.isDirectory()) await walk(childAbs, childRel);
            else out.push(childRel);
        }
    }
    for (const folder of ALL_FOLDERS) await walk(path.join(targetDir, folder), folder);
    return out;
}

// After deletions, prune empty directories INSIDE the 13 manifest folders (bottom-up). The
// 13 top-level folders themselves are kept (mkdir-recursive re-creates them anyway, and
// keeping them around makes the workspace shape stable). Never touches dirs outside the 13.
async function pruneEmptySubdirs(targetDir) {
    async function prune(dirAbs, depth) {
        let entries;
        try { entries = await fs.readdir(dirAbs, { withFileTypes: true }); }
        catch (e) { if (e.code === "ENOENT") return; throw e; }
        for (const e of entries) {
            if (e.isDirectory()) await prune(path.join(dirAbs, e.name), depth + 1);
        }
        if (depth === 0) return;                         // keep the 13 top-level dirs
        const after = await fs.readdir(dirAbs);
        if (after.length === 0) await fs.rmdir(dirAbs);
    }
    for (const folder of ALL_FOLDERS) await prune(path.join(targetDir, folder), 0);
}

async function writeJsonEntry(baseDir, folder, name, data) {
    const filePath = path.join(baseDir, folder, `${name}.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function writeBase64Entry(baseDir, folder, name, base64Content) {
    const filePath = path.join(baseDir, folder, name);
    await fs.mkdir(path.dirname(filePath), { recursive: true }); // name may contain subdirs
    await fs.writeFile(filePath, Buffer.from(base64Content || "", "base64"));
}

// Port of expandPalFiles(): default folders + JSON entries + base64 entries to disk.
async function expandPalFiles(pal) {
    const written = { json: [], base64: [] };
    for (const folder of ALL_FOLDERS) {
        await fs.mkdir(path.join(pal.path, folder), { recursive: true });
    }
    for (const [getter, key, folder] of JSON_TYPES) {
        for (const entry of pal[getter]) {
            await writeJsonEntry(pal.path, folder, entry.string, entry[key]);
            written.json.push(path.join(folder, `${entry.string}.json`));
        }
    }
    for (const [getter, key, folder] of BASE64_TYPES) {
        for (const entry of pal[getter]) {
            const content = entry[key] ? entry[key].content : "";
            await writeBase64Entry(pal.path, folder, entry.string, content);
            written.base64.push(path.join(folder, entry.string));
        }
    }
    return written;
}

// Port of clearContent(): blank the 9 base64 content fields before saving pal.json.
function clearContent(pal) {
    for (const [getter, key] of BASE64_TYPES) {
        for (const entry of pal[getter]) {
            if (entry[key]) entry[key].content = "";
        }
    }
}

// Port of saveLocal(): write pal.json (structure only; base64 content blanked).
async function saveLocal(pal) {
    await fs.mkdir(pal.path, { recursive: true });
    await fs.writeFile(path.join(pal.path, "pal.json"), JSON.stringify(pal, null, 2), "utf8");
}

// Full pull (SYNC). Returns { resolved, serverPal, pal, written, removed }.
//   - Pull-managed = the 13 manifest folders + pal.json. Files there are overwritten with the
//     server state; files no longer in the server manifest are removed (server-side deletes).
//   - Everything else in targetDir is untouched (root-level user files like spec.md, user-
//     created subdirs like references/, and palsync-managed files .palsync.json / CLAUDE.md /
//     .claude/ / .mcp.json all survive a pull cleanly).
// environment carries only the url — never credentials, so nothing secret reaches pal.json.
async function pull(session, guid, targetDir) {
    const resolved = await resolveServerPalByGuid(session, guid);
    if (!resolved) {
        throw new Error("GUID " + guid + " not found on " + session.environment.url);
    }
    const palResp = await CloudPistonAPIManager.getPal(session, resolved.id);
    if (!palResp || !palResp.success || !palResp.pal) {
        throw new Error("GetPal.do failed for id " + resolved.id);
    }
    const serverPal = palResp.pal;

    // 1) Ensure the workspace dir exists (no-op if already there — DO NOT wipe).
    await fs.mkdir(targetDir, { recursive: true });

    // Deep-clone for the Pal instance: expandPalFiles writes from it and clearContent blanks
    // its base64 content in place. Cloning keeps the returned serverPal pristine (full content)
    // so callers/drift checks see the true server state, not a half-cleared object.
    const palData = JSON.parse(JSON.stringify(serverPal));
    const pal = new Pal(Object.assign(palData, {
        id: resolved.id,
        path: targetDir,
        environment: { url: session.environment.url, name: session.environment.name, platformVersion: session.environment.platformVersion || "" }
    }));

    // 2) STALE-DELETE: anything currently under the 13 manifest folders that is NOT in the
    //    server's current manifest is removed (the server-side-delete case).
    const serverSet = manifestPaths(pal);
    const localTracked = await listTrackedFiles(targetDir);
    const removed = [];
    for (const rel of localTracked) {
        if (!serverSet.has(rel)) {
            await fs.unlink(path.join(targetDir, ...rel.split("/")));
            removed.push(rel);
        }
    }

    // 3) Write the server state. expandPalFiles mkdir's each folder + sub-path, then writes
    //    JSON entries and base64 entries — overwriting any prior local versions in place.
    const written = await expandPalFiles(pal);

    // 4) Prune any subdirs INSIDE the 13 manifest folders that became empty after deletions.
    //    The 13 top-level folders themselves stay (kept for stable workspace shape).
    await pruneEmptySubdirs(targetDir);

    // 5) pal.json — clear base64 content fields, then write the manifest. This is also
    //    pull-managed and gets overwritten on every pull.
    clearContent(pal);
    await saveLocal(pal);

    return { resolved, serverPal, pal, written, removed };
}

module.exports = { pull, expandPalFiles, clearContent, saveLocal, manifestPaths, listTrackedFiles, pruneEmptySubdirs, ALL_FOLDERS };
