"use strict";
// Workspace setup: pull the pal to disk, auto-lock it, inject context (preserving a pre-existing
// user CLAUDE.md across the pull), write .palsync.json, and register the MCP server. After this
// the directory is a ready Claude Code workspace. The lock is left HELD — the MCP server (booted
// by Claude Code) owns its lifecycle/release; the launcher does not release on exit.
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { pull } = require("../core/pull");
const lock = require("../core/lock");
const contextInject = require("./contextInject");
const palsyncfile = require("../core/palsyncfile");
const { register } = require("../mcp/register");
const { hashWorkspace } = require("../core/workspaceHash");

function slug(name) {
    return String(name).trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "pal";
}

function defaultWorkspaceDir(palName) {
    return path.join(os.homedir(), "PalBuilder", slug(palName));
}

async function readIfExists(p) {
    try { return await fs.readFile(p, "utf8"); } catch (e) { if (e.code === "ENOENT") return null; throw e; }
}

// Run the full setup. Returns a summary. Throws if the pal is locked by another user.
async function setup({ session, cloudUrl, sel, workspaceDir, log = () => {} }) {
    const claudePath = path.join(workspaceDir, "CLAUDE.md");

    // Preserve a user's existing CLAUDE.md across the pull (pull wipes the dir).
    const priorClaude = await readIfExists(claudePath);

    log("pulling " + sel.pal.name + " → " + workspaceDir);
    const { resolved, written } = await pull(session, sel.pal.guid, workspaceDir);

    // auto-lock (own-stale reclaim handled inside; never breaks another user's lock)
    log("locking pal");
    const lk = await lock.acquireByGuid(session, sel.pal.guid, { force: false });
    if (!lk.acquired) {
        if (lk.heldByOther) throw new Error("Pal is locked by " + lk.holder + " since " + lk.sinceText + " — cannot start a session. (Resolve in the PalBuilder GUI.)");
        throw new Error("Could not lock the pal: " + (lk.reason || "unknown"));
    }

    // restore the user's CLAUDE.md (if any) before injecting, so the managed block merges in
    if (priorClaude != null) await fs.writeFile(claudePath, priorClaude, "utf8");
    log("injecting CLAUDE.md + skills");
    const injected = await contextInject.inject(workspaceDir, { palName: sel.pal.name });

    // .palsync.json (drift marker = pulled lastModifiedDate; localHash baseline)
    const record = palsyncfile.buildRecord({
        cloudUrl, userId: session.userId, username: session.username,
        pal: { guid: sel.pal.guid, name: sel.pal.name, lastModifiedDate: resolved.lastModifiedDate },
        workspaceDir
    });
    record.localHash = hashWorkspace(workspaceDir);
    record.pulledAt = new Date().toISOString();
    await palsyncfile.write(workspaceDir, record);

    // register MCP server with Claude Code
    log("registering palsync MCP server (.mcp.json)");
    const reg = await register(workspaceDir);

    return {
        workspaceDir,
        pulledFiles: written.base64.length,
        dataFiles: written.json.length,
        locked: lk.acquired,
        lockHolder: lk.holder,
        injected,
        mcpConfig: reg.filePath,
        record,
        userClaudePreserved: priorClaude != null
    };
}

module.exports = { setup, defaultWorkspaceDir, slug };
