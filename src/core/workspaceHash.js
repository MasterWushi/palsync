"use strict";
// Deterministic hash of the SERVER-TRACKED files in a pal workspace. Used as a baseline at
// pull/push time so pal_pull can detect un-pushed local changes (the reverse drift guard).
//
// SCOPE — the 13 manifest folders + pal.json. Exactly the files pull manages; user-only files
// at the workspace root (spec.md, references/, notes/) do NOT enter the hash, so editing or
// adding them never triggers the drift guard.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const IN_SCOPE = [
    "data", "datalists", "datasets", "dataviews",
    "attachments", "documents", "emails", "fragments",
    "images", "pages", "scripts", "styles", "workflows"
];
const MANIFEST_FILE = "pal.json";

function hashWorkspace(dir) {
    const files = [];
    for (const folder of IN_SCOPE) walk(path.join(dir, folder), folder, files);
    const manifestAbs = path.join(dir, MANIFEST_FILE);
    if (fs.existsSync(manifestAbs)) files.push({ rel: MANIFEST_FILE, abs: manifestAbs });
    files.sort((a, b) => a.rel.localeCompare(b.rel));
    const h = crypto.createHash("sha256");
    for (const f of files) {
        h.update(f.rel); h.update("\0");
        h.update(fs.readFileSync(f.abs)); h.update("\0");
    }
    return h.digest("hex");
}

function walk(dir, relBase, out) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
        const abs = path.join(dir, e.name);
        const rel = path.join(relBase, e.name);
        if (e.isDirectory()) walk(abs, rel, out);
        else out.push({ rel, abs });
    }
}

module.exports = { hashWorkspace, IN_SCOPE };
