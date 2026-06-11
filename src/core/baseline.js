"use strict";
// Baseline CONTENT store: a snapshot of the lintable server-tracked files as they were at the
// last pull/push (i.e. the last time local == server). Lives in <workspace>/.palsync/baseline/.
//
// Used by the pre-push gate to block ONLY on errors a change INTRODUCED — by linting the baseline
// version of a touched file and the current version and comparing. A pal carrying pre-existing
// errors in a file (e.g. a legacy workflow full of object literals) no longer forces the agent to
// rewrite that legacy code just to land an unrelated edit; only NEW errors block. (This snapshot
// is also the foundation a future 3-way merge needs.)
//
// Only LINTABLE files are stored (workflow JS, page/fragment markup, dataset defs) — the only
// files the gate diffs — so the store stays small (text, not images/binaries). The store lives
// under .palsync/, which pull's stale-delete and the workspace hash never touch.
const fs = require("fs");
const path = require("path");

const BASELINE_DIR = path.join(".palsync", "baseline");

// The files the gate can lint (must match validate/index.js lintContent dispatch).
function isLintable(rel) {
    if (rel.startsWith("workflows/") && rel.endsWith(".js")) return true;
    if ((rel.startsWith("pages/") || rel.startsWith("fragments/")) && /\.(html?|xhtml)$/i.test(rel)) return true;
    if (rel.startsWith("datasets/") && rel.endsWith(".json")) return true;
    return false;
}

// Snapshot the current (server-equal) lintable files into the baseline store. Call right after a
// pull or a successful push, when the workspace's server-tracked files match the server.
function snapshot(workspaceDir, serverPaths) {
    const baseAbs = path.join(workspaceDir, BASELINE_DIR);
    fs.rmSync(baseAbs, { recursive: true, force: true });
    for (const rel of serverPaths || []) {
        if (!isLintable(rel)) continue;
        const src = path.join(workspaceDir, ...rel.split("/"));
        let content;
        try { content = fs.readFileSync(src); }
        catch (e) { if (e.code === "ENOENT") continue; throw e; }
        const dest = path.join(baseAbs, ...rel.split("/"));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, content);
    }
}

// Baseline content for one file (POSIX rel), or null if not snapshotted.
function read(workspaceDir, rel) {
    try { return fs.readFileSync(path.join(workspaceDir, BASELINE_DIR, ...rel.split("/")), "utf8"); }
    catch (e) { return null; }
}

// Is there a baseline store at all? (false for legacy workspaces created before this feature.)
function exists(workspaceDir) {
    try { return fs.readdirSync(path.join(workspaceDir, BASELINE_DIR)).length > 0; }
    catch (e) { return false; }
}

module.exports = { snapshot, read, exists, isLintable, BASELINE_DIR };
