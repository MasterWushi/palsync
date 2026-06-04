"use strict";
// Deterministic hash of the in-scope (editable) files in a pal workspace. Used as a baseline
// at pull/push time so pal_pull can detect un-pushed local changes (the reverse drift guard).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const IN_SCOPE = ["attachments", "documents", "emails", "fragments", "images", "pages", "scripts", "styles", "workflows"];

function hashWorkspace(dir) {
    const files = [];
    for (const folder of IN_SCOPE) walk(path.join(dir, folder), folder, files);
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
