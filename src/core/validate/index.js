"use strict";
// pal_validate core: lint a pal workspace OFFLINE for the mistakes that silently break in
// PalBuilder — invalid workflow JS (object literals, let/const, …) and invalid markup
// (unclosed void tags, undocumented c: attributes, aria on c:field, ${} in inline script, …).
// Catches the most common failure mode BEFORE a push, where it's fastest and cheapest to fix.
//
// Scope by folder:
//   workflows/*.js     → restricted-engine JS lint (workflowJs)
//   pages/**, fragments/** (markup) → XHTML/c:-tag lint (markup)
//   scripts/ styles/ images/ data/… → NOT linted (client JS is unrestricted; CSS/assets/data
//                                      have no rules here)
// The result is built for the least capable agent: a one-line verdict it can branch on, then
// each finding as a full sentence with file:line, an ERROR/WARNING word, and the fix.
const fs = require("fs");
const path = require("path");
const { lintWorkflowJs } = require("./workflowJs");
const { lintMarkup } = require("./markup");

const MARKUP_EXT = new Set([".html", ".htm", ".xhtml"]);

function walkFiles(absDir, relBase, out) {
    let entries;
    try { entries = fs.readdirSync(absDir, { withFileTypes: true }); }
    catch (e) { if (e.code === "ENOENT") return; throw e; }
    for (const e of entries) {
        const abs = path.join(absDir, e.name);
        const rel = relBase + "/" + e.name;
        if (e.isDirectory()) walkFiles(abs, rel, out);
        else out.push({ abs, rel });
    }
}

function readUtf8(abs) {
    try { return fs.readFileSync(abs, "utf8"); } catch (e) { return null; }
}

// Lint the whole workspace. Returns { findings, errors, warnings, filesChecked }.
function validateWorkspace(workspaceDir) {
    const findings = [];
    let filesChecked = 0;

    // workflows/*.js (restricted engine)
    const wf = [];
    walkFiles(path.join(workspaceDir, "workflows"), "workflows", wf);
    for (const f of wf) {
        if (!f.rel.endsWith(".js")) continue;
        const src = readUtf8(f.abs);
        if (src == null) continue;
        filesChecked++;
        findings.push(...lintWorkflowJs(f.rel, src));
    }

    // pages/** and fragments/** (markup)
    for (const folder of ["pages", "fragments"]) {
        const files = [];
        walkFiles(path.join(workspaceDir, folder), folder, files);
        for (const f of files) {
            if (!MARKUP_EXT.has(path.extname(f.rel).toLowerCase())) continue;
            const src = readUtf8(f.abs);
            if (src == null) continue;
            filesChecked++;
            findings.push(...lintMarkup(f.rel, src));
        }
    }

    findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    const errors = findings.filter(f => f.severity === "error").length;
    const warnings = findings.filter(f => f.severity === "warn").length;
    return { findings, errors, warnings, filesChecked };
}

// Format for an agent. `context` tags the message ("pre-push" vs standalone). Leads with an
// unambiguous verdict line, then every finding spelled out. Never a bare count.
function formatValidation(result, { context = "validate" } = {}) {
    const { findings, errors, warnings, filesChecked } = result;
    if (!findings.length) {
        return "VALIDATION PASSED — 0 problems found in " + filesChecked + " file(s). " +
            "The workflow JS and markup follow PalBuilder's rules" +
            (context === "pre-push" ? "; the push can proceed." : ".");
    }
    const head = (errors > 0 ? "VALIDATION FAILED" : "VALIDATION PASSED WITH WARNINGS") +
        " — " + errors + " error(s) and " + warnings + " warning(s) in " + filesChecked + " file(s).";
    const meaning = errors > 0
        ? "ERROR = this WILL fail to compile or save in PalBuilder; you must fix every error" +
          (context === "pre-push" ? " before pushing (or pass force/skipValidation to push anyway, which is not recommended)." : ".")
        : "WARNING = likely unsupported / risky; review each one. No errors, so a push is allowed.";
    // Group by file for readability.
    const byFile = {};
    for (const f of findings) (byFile[f.file] = byFile[f.file] || []).push(f);
    const blocks = [];
    for (const file of Object.keys(byFile)) {
        const lines = byFile[file].map(f =>
            "   " + (f.severity === "error" ? "ERROR" : "WARNING") + " " + file + ":" + f.line + " — " + f.message);
        blocks.push(lines.join("\n"));
    }
    return head + "\n" + meaning + "\n\n" + blocks.join("\n\n");
}

module.exports = { validateWorkspace, formatValidation };
