"use strict";
// Local (reverse) drift: does the workspace contain un-pushed changes to server-tracked files?
// The forward guard (core/drift) asks "did the SERVER move past my last pull?"; this one asks
// "did MY DISK move past my last pull?" — the question every pull must answer before it
// overwrites anything.
//
// With a per-file baseline (record.fileHashes, written at every pull/push) the answer is
// per-file and graded:
//   - changed  : server-tracked file edited locally   → pull would OVERWRITE it      (dirty)
//   - deleted  : server-tracked file removed locally  → pull would RESURRECT it      (dirty)
//   - added    : new local file in a manifest folder  → pull PRESERVES it (safe)     (not dirty)
//   - manifestOnly : pal.json changed with nothing explaining it → can't merge       (dirty)
// pal.json changing ALONGSIDE added files is the normal agent flow (new file + manifest entry)
// and is NOT dirty — pull's sync merges those entries forward.
//
// Legacy records (localHash only, no fileHashes) can detect drift but not name files: any
// mismatch is dirty, and `legacy: true` tells the caller why there's no file list.
const { hashWorkspaceFiles, hashWorkspace, MANIFEST_FILE } = require("./workspaceHash");

function diffWorkspace(record, dir) {
    if (record && record.fileHashes && typeof record.fileHashes === "object") {
        const { files } = hashWorkspaceFiles(dir);
        const baseline = record.fileHashes;
        const changed = [], added = [], deleted = [];
        let manifestChanged = false;
        for (const rel of Object.keys(files)) {
            if (!(rel in baseline)) { added.push(rel); continue; }
            if (files[rel] !== baseline[rel]) {
                if (rel === MANIFEST_FILE) manifestChanged = true;
                else changed.push(rel);
            }
        }
        for (const rel of Object.keys(baseline)) {
            if (!(rel in files)) deleted.push(rel);
        }
        // pal.json edits are dirty only when no added file explains them (a pure manifest
        // mutation has nothing for pull's entry-merge to carry forward).
        const manifestOnly = manifestChanged && added.length === 0;
        return {
            dirty: changed.length > 0 || deleted.length > 0 || manifestOnly,
            changed, added, deleted, manifestChanged, manifestOnly,
            legacy: false
        };
    }
    if (record && record.localHash) {
        const dirty = hashWorkspace(dir) !== record.localHash;
        return { dirty, changed: [], added: [], deleted: [], manifestChanged: false, manifestOnly: false, legacy: true };
    }
    // No baseline at all (pre-baseline record or fresh dir): nothing to compare against.
    return { dirty: false, changed: [], added: [], deleted: [], manifestChanged: false, manifestOnly: false, legacy: false, noBaseline: true };
}

// Human-readable file listing for prompts/messages. Caps each class so a huge workspace
// doesn't flood the terminal.
function describeDiff(d, { cap = 15 } = {}) {
    if (d.legacy) {
        return "Local changes detected (legacy record — per-file detail unavailable; it will be recorded from the next pull/push).";
    }
    const lines = [];
    const list = (label, arr) => {
        if (!arr.length) return;
        lines.push("  " + label + " (" + arr.length + "):");
        for (const rel of arr.slice(0, cap)) lines.push("    - " + rel);
        if (arr.length > cap) lines.push("    … and " + (arr.length - cap) + " more");
    };
    list("modified locally (pull would overwrite)", d.changed);
    list("deleted locally (pull would restore)", d.deleted);
    list("new local files (pull preserves these)", d.added);
    if (d.manifestOnly) lines.push("  pal.json has local edits not explained by new files (pull would overwrite them)");
    else if (d.manifestChanged) lines.push("  pal.json updated for the new files (entries are carried forward by pull)");
    return lines.join("\n");
}

module.exports = { diffWorkspace, describeDiff };
