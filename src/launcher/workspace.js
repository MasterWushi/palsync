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
const { registerCodex } = require("../mcp/registerCodex");
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
//   withDesign (default false) opts the workspace into the design skills; see contextInject.
//   agent ("claude" default | "codex") picks the injection destinations and MCP registration path.
async function setup({ session, cloudUrl, sel, workspaceDir, withDesign = false, agent = "claude", log = () => {} }) {
    const claudePath = path.join(workspaceDir, "CLAUDE.md");

    // Preserve a user's existing CLAUDE.md across the pull (pull wipes the dir).
    const priorClaude = await readIfExists(claudePath);

    log("pulling " + sel.pal.name + " → " + workspaceDir);
    const { resolved, written } = await pull(session, sel.pal.guid, workspaceDir);

    // auto-lock (own Webstart-lock reclaim is automatic; setup never force-overrides a PalBuilder lock)
    log("locking pal");
    const lk = await lock.acquireByGuid(session, sel.pal.guid, { force: false });
    if (!lk.acquired) {
        if (lk.blocked === "gui-lock-self") {
            throw new Error("This pal is locked — you have \"" + sel.pal.name + "\" checked out in PalBuilder (since " + lk.since + "). Unlock and close it in PalBuilder, then re-run palsync.");
        }
        if (lk.blocked === "gui-lock-other") {
            throw new Error("This pal is locked by " + lk.holder + " (since " + lk.since + ") — cannot start a session. Unlock and close it in PalBuilder.");
        }
        throw new Error("Could not lock \"" + sel.pal.name + "\" (" + (lk.blocked || "unknown") + "). Unlock and close it in PalBuilder, then re-run palsync.");
    }

    // restore the user's CLAUDE.md (if any) before injecting, so the managed block merges in
    if (priorClaude != null) await fs.writeFile(claudePath, priorClaude, "utf8");
    log("injecting CLAUDE.md + skills" + (withDesign ? " (with design system)" : "") +
        (agent === "codex" ? " + AGENTS.md/.agents (Codex)" : ""));
    const injected = await contextInject.inject(workspaceDir, { palName: sel.pal.name, withDesign, agent });

    // .palsync.json (drift marker = pulled lastModifiedDate; localHash baseline)
    const record = palsyncfile.buildRecord({
        cloudUrl, userId: session.userId, username: session.username,
        pal: { guid: sel.pal.guid, name: sel.pal.name, lastModifiedDate: resolved.lastModifiedDate },
        workspaceDir
    });
    record.localHash = hashWorkspace(workspaceDir);
    record.pulledAt = new Date().toISOString();
    await palsyncfile.write(workspaceDir, record);

    // register the MCP server for the chosen agent.
    let reg;
    if (agent === "codex") {
        log("registering palsync MCP server with Codex (codex mcp add)");
        reg = await registerCodex(workspaceDir);
        if (reg.ok) {
            log("  registered with Codex" + (reg.refreshed ? " (refreshed)" : ""));
            // The Codex MCP entry is GLOBAL (~/.codex/config.toml) — one shared `palsync` server
            // whose PALSYNC_WORKSPACE is whatever was registered last. Make the current target loud.
            log("  Codex MCP 'palsync' now targets: " + workspaceDir + "  (" + sel.pal.name + ")");
        } else if (reg.reason === "codex-not-found") {
            log("  ⚠ Codex CLI not found — register the MCP server manually once Codex is installed:\n      " + reg.command);
        } else {
            log("  ⚠ `codex mcp add` failed (" + (reg.stderr || "unknown") + ") — register manually:\n      " + reg.command);
        }
    } else {
        log("registering palsync MCP server (.mcp.json)");
        reg = await register(workspaceDir);
    }

    return {
        workspaceDir,
        pulledFiles: written.base64.length,
        dataFiles: written.json.length,
        locked: lk.acquired,
        lockHolder: lk.holder,
        injected,
        agent,
        mcpConfig: reg.filePath || null,   // .mcp.json path (Claude) or null (Codex uses its own config)
        mcpRegistration: reg,
        record,
        userClaudePreserved: priorClaude != null
    };
}

module.exports = { setup, defaultWorkspaceDir, slug };
