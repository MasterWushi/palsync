"use strict";
// Build the MCP session context from a workspace: read .palsync.json, pull the password from
// the OS keychain (never env, never disk), authenticate, and acquire the session lock with the
// guaranteed-release lifecycle. Returns ctx used by every tool.
const palsyncfile = require("../core/palsyncfile");
const keychain = require("../platform/keychain");
const { authenticate } = require("../core/session");
const { LockLifecycle } = require("../lifecycle/lockLife");

async function buildContext(workspaceDir, { idleMs, log = () => {}, acquireLock = true } = {}) {
    const record = await palsyncfile.read(workspaceDir);
    const password = keychain.getPassword(record.cloudUrl, record.username);
    if (!password) {
        throw new Error("No keychain credential for " + record.username + " @ " + record.cloudUrl + " — run the launcher to log in.");
    }
    const session = await authenticate(record.cloudUrl, record.username, password);

    // exitOnIdle:false (also the constructor default) — the MCP server's lifetime belongs to
    // its client; idle releases only the lock, and the next tool call re-acquires it.
    const lifecycle = new LockLifecycle(session, record.palGuid,
        idleMs !== undefined ? { idleMs, log, exitOnIdle: false } : { log, exitOnIdle: false });

    const ctx = {
        session,
        record,
        workspaceDir,
        lifecycle,
        persist: () => palsyncfile.write(workspaceDir, record)
    };

    if (acquireLock) {
        await lifecycle.acquire();          // auto-locks (own-stale reclaim handled inside)
        lifecycle.installSignalHandlers();  // guaranteed release on exit signals
    }
    return ctx;
}

module.exports = { buildContext };
