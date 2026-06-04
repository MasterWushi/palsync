"use strict";
// .palsync.json — the per-workspace sync record the launcher writes and the MCP server reads.
// Holds only non-secret identifiers (cloud url, stable GUID, name, userId, username, the
// pulled lastModifiedDate drift marker, workspace dir). The password NEVER goes here — it
// stays in the OS keychain, looked up by cloudUrl+username. The transient 64-hex pal id is
// deliberately NOT persisted (it rotates per enumeration; we re-resolve from the GUID).
const fs = require("fs/promises");
const path = require("path");

const FILENAME = ".palsync.json";

// Build the record from a completed selection + session.
function buildRecord({ cloudUrl, userId, username, pal, workspaceDir, lastModifiedDate }) {
    return {
        version: 1,
        cloudUrl: cloudUrl,
        userId: userId,
        username: username,                       // not secret — keychain key, no password here
        palGuid: pal.guid,                        // stable identifier
        palName: pal.name,
        workspaceDir: workspaceDir || null,
        lastModifiedDate: lastModifiedDate !== undefined ? lastModifiedDate : pal.lastModifiedDate, // drift marker
        pulledAt: null                            // set when pull writes files (M7)
    };
}

async function write(dir, record) {
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, FILENAME);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
    return filePath;
}

async function read(dir) {
    const filePath = path.join(dir, FILENAME);
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
}

module.exports = { buildRecord, write, read, FILENAME };
