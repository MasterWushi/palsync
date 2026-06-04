"use strict";
// Headless pull: resolve fresh id by GUID -> getPal(id) -> write the server pal to disk.
// This is a vscode-free port of the extension's Pal.fromCP + expandPalFiles + clearContent
// + saveLocal (types/palObjects/pal.js): vscode.workspace.fs writes become fs/promises.
//
// Datasets/dataviews/data/datalists are JSON passthrough — written verbatim, never created
// or altered. Only the 9 base64 "content" types are decoded to files (and then blanked in
// pal.json by clearContent, exactly like the extension).
const fs = require("fs/promises");
const path = require("path");
const { CloudPistonAPIManager } = require("../../lib/apiManager");
const { Pal } = require("../../lib/pal");
const { resolveServerPalByGuid } = require("./resolve");

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

// Full pull. Returns { resolved, serverPal, pal, written }.
// targetDir is wiped and recreated (matches fromCP). environment carries only the url —
// never credentials, so nothing secret reaches pal.json.
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

    await fs.rm(targetDir, { recursive: true, force: true });
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

    const written = await expandPalFiles(pal);
    clearContent(pal);
    await saveLocal(pal);

    return { resolved, serverPal, pal, written };
}

module.exports = { pull, expandPalFiles, clearContent, saveLocal };
