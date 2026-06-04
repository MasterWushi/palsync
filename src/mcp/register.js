"use strict";
// Register palsync-mcp with Claude Code by writing a project-scoped .mcp.json into the
// workspace. Claude Code auto-discovers this file and launches the server (node + the bin
// script) with PALSYNC_WORKSPACE pointing at the pal. Cross-platform: uses the running node
// binary and an absolute script path; no shell, no OS-specific launcher.
const fs = require("fs/promises");
const path = require("path");

const MCP_BIN = path.resolve(__dirname, "..", "..", "bin", "palsync-mcp.js");

function buildMcpConfig(workspaceDir, { nodePath = process.execPath } = {}) {
    return {
        mcpServers: {
            palsync: {
                command: nodePath,
                args: [MCP_BIN],
                env: { PALSYNC_WORKSPACE: workspaceDir }
            }
        }
    };
}

// Write/merge .mcp.json. Preserves any other mcpServers the user already configured.
async function register(workspaceDir, opts = {}) {
    const filePath = path.join(workspaceDir, ".mcp.json");
    let existing = {};
    try { existing = JSON.parse(await fs.readFile(filePath, "utf8")); } catch (e) { /* none */ }
    const cfg = buildMcpConfig(workspaceDir, opts);
    const merged = Object.assign({}, existing, { mcpServers: Object.assign({}, existing.mcpServers, cfg.mcpServers) });
    await fs.writeFile(filePath, JSON.stringify(merged, null, 2), "utf8");
    return { filePath, config: merged };
}

module.exports = { register, buildMcpConfig, MCP_BIN };
