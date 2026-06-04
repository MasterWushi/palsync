#!/usr/bin/env node
"use strict";
// palsync MCP server entry point. Headless; speaks MCP over stdio. Reads PALSYNC_WORKSPACE
// (or cwd) for the workspace whose .palsync.json + keychain session it serves.
require("../src/mcp/server").main().catch(err => {
    process.stderr.write("palsync-mcp failed: " + (err && err.stack ? err.stack : err) + "\n");
    process.exit(1);
});
