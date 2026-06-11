"use strict";
// Template starters: apply a pre-built pal scaffold (pages/fragments/scripts/styles + the
// matching pal.json entries) into a workspace, so a new pal starts from a correct, designed,
// SEO-sound skeleton instead of a blank page. The agent then customizes content — the starter
// guarantees the structure, the design floor, and the SEO floor from the first push.
//
// Platform rules this respects (all empirically confirmed):
//   - Pages/fragments/scripts/styles CAN be created via push (file + pal.json entry).
//   - WORKFLOWS CANNOT be created via push (fixed slots, server-rejected). A template's
//     workflow is applied as a CONTENT OVERWRITE only when the pal already has that slot;
//     otherwise the file is written for reference and reported as needing a PalBuilder slot.
//   - Existing files are NEVER overwritten (starters fill empty/stub pals; report skips).
//   - {{PAL_NAME}} in text files is replaced with the pal's name.
//
// A template lives at bundled-context/starters/<name>/ with a template.json manifest:
//   { "description": "...", "palType": "palTypeWeb"|"palTypeConsole", "files": [
//       { "path": "pages/home.html" }, ...        // folder prefix decides the pal.json entry type
//   ] }
const fs = require("fs");
const path = require("path");

const STARTERS_DIR = path.join(__dirname, "..", "..", "bundled-context", "starters");

// folder → pal.json node + entry sub-key + whether palType applies.
const ENTRY_TYPES = {
    pages: { key: "pages", sub: "Page", contentType: "text/html", palTyped: true, extra: { hideConsoleMenu: false } },
    fragments: { key: "fragments", sub: "Fragment", contentType: "text/html", palTyped: true, extra: { parseable: false } },
    scripts: { key: "scripts", sub: "Script", contentType: "text/javascript", palTyped: true, extra: { bookmarks: "" } },
    styles: { key: "styles", sub: "Style", contentType: "text/css", palTyped: false, extra: {} },
    images: { key: "images", sub: "Image", contentType: "image/png", palTyped: false, extra: {} },
    workflows: { key: "workflows", sub: "Workflow", palTyped: false, extra: {} } // content-overwrite only
};

function listTemplates() {
    let names = [];
    try { names = fs.readdirSync(STARTERS_DIR, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name); }
    catch (e) { /* no starters dir */ }
    return names.map(name => {
        let description = "";
        try { description = JSON.parse(fs.readFileSync(path.join(STARTERS_DIR, name, "template.json"), "utf8")).description || ""; }
        catch (e) { /* unreadable manifest */ }
        return { name, description };
    });
}

function loadTemplate(name) {
    const dir = path.join(STARTERS_DIR, name);
    const manifestPath = path.join(dir, "template.json");
    if (!fs.existsSync(manifestPath)) {
        const known = listTemplates().map(t => t.name);
        throw new Error("Unknown template \"" + name + "\". Available templates: " +
            (known.length ? known.join(", ") : "(none bundled)") + ". Run `palsync scaffold --list` to see them.");
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return { dir, manifest };
}

function substitute(content, vars) {
    return content.replace(/\{\{PAL_NAME\}\}/g, vars.palName || "My Pal");
}

// Apply template `name` into workspaceDir. Mutates pal.json (adds entries for created files).
// Returns { created, skipped, workflows, entriesAdded } — every item human/dumb-model readable.
function applyTemplate(workspaceDir, name, { palName } = {}) {
    const { dir, manifest } = loadTemplate(name);
    const palJsonPath = path.join(workspaceDir, "pal.json");
    if (!fs.existsSync(palJsonPath)) {
        throw new Error("No pal.json in " + workspaceDir + " — this isn't a pal workspace yet. Run `palsync setup` (or the launcher) first, then scaffold.");
    }
    const pal = JSON.parse(fs.readFileSync(palJsonPath, "utf8"));
    const palType = manifest.palType || "palTypeWeb";
    const vars = { palName: palName || pal.layout && pal.layout.name || "My Pal" };

    const created = [], skipped = [], workflows = [], entriesAdded = [];

    for (const f of manifest.files || []) {
        const rel = f.path;                                   // e.g. "pages/home.html"
        const folder = rel.split("/")[0];
        const entryString = rel.slice(folder.length + 1);     // path inside the folder
        const type = ENTRY_TYPES[folder];
        if (!type) { skipped.push({ rel, reason: "unsupported folder \"" + folder + "\" — template bug" }); continue; }

        const srcAbs = path.join(dir, rel);
        const destAbs = path.join(workspaceDir, ...rel.split("/"));
        const raw = fs.readFileSync(srcAbs, "utf8");
        const content = substitute(raw, vars);

        // WORKFLOWS: content-overwrite only when the slot exists (push cannot create slots).
        if (folder === "workflows") {
            const node = pal.workflows && pal.workflows.entry;
            const slot = Array.isArray(node) && node.find(e => e && e.string === entryString);
            if (slot) {
                if (fs.existsSync(destAbs) && fs.readFileSync(destAbs, "utf8").trim().length > 200) {
                    // A real workflow already lives here — don't clobber working logic.
                    workflows.push({ rel, applied: false, reason: "the pal already has substantive code in " + entryString + " — left untouched (the template skeleton is only for empty/stub workflows)" });
                } else {
                    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
                    fs.writeFileSync(destAbs, content, "utf8");
                    workflows.push({ rel, applied: true, reason: "slot \"" + entryString + "\" exists — template workflow content applied (an EDIT, which push supports)" });
                }
            } else {
                const refAbs = destAbs + ".template";
                fs.mkdirSync(path.dirname(refAbs), { recursive: true });
                fs.writeFileSync(refAbs, content, "utf8");
                workflows.push({ rel, applied: false, reason: "this pal has NO workflow slot named \"" + entryString + "\" and push cannot create one. The template was saved as " + path.basename(refAbs) + " for reference — create the workflow in PalBuilder first, then copy the content in and push" });
            }
            continue;
        }

        // Everything else: create file + manifest entry, never overwrite.
        if (fs.existsSync(destAbs)) { skipped.push({ rel, reason: "file already exists — left untouched" }); continue; }
        fs.mkdirSync(path.dirname(destAbs), { recursive: true });
        fs.writeFileSync(destAbs, content, "utf8");
        created.push(rel);

        // pal.json entry (idempotent — skip if an entry already exists).
        if (pal[type.key] === "" || pal[type.key] == null) pal[type.key] = { entry: [] };
        if (!Array.isArray(pal[type.key].entry)) pal[type.key].entry = [];
        if (!pal[type.key].entry.some(e => e && e.string === entryString)) {
            const body = Object.assign({ content: "", contentType: type.contentType, filename: entryString }, type.extra);
            if (type.palTyped) body.palType = palType;
            const entry = { string: entryString };
            entry[type.sub] = body;
            pal[type.key].entry.push(entry);
            entriesAdded.push(folder + "/" + entryString);
        }
    }

    fs.writeFileSync(palJsonPath, JSON.stringify(pal, null, 2), "utf8");
    return { template: name, palType, created, skipped, workflows, entriesAdded };
}

// Dumb-model-grade report: what happened, then exactly what to do next.
function formatScaffoldReport(r) {
    const lines = ["Applied template \"" + r.template + "\" (" + r.palType + ")."];
    if (r.created.length) lines.push("Created " + r.created.length + " file(s) + pal.json entries:\n" + r.created.map(x => "   - " + x).join("\n"));
    else lines.push("No new files were created.");
    for (const w of r.workflows) lines.push((w.applied ? "Workflow applied: " : "Workflow NOT applied: ") + w.rel + " — " + w.reason + ".");
    for (const s of r.skipped) lines.push("Skipped: " + s.rel + " — " + s.reason + ".");
    lines.push("Next steps: customize the content (the files are placeholders with correct structure), run `palsync validate`, then `palsync push`. For a web pal, run `palsync seo-audit` after pushing.");
    return lines.join("\n");
}

module.exports = { applyTemplate, listTemplates, loadTemplate, formatScaffoldReport, STARTERS_DIR, ENTRY_TYPES };
