"use strict";
// The palsync MCP server: registers the five tools and serves them over stdio. Tool handlers
// resolve their ctx lazily via getCtx() so the server can be constructed (and its tools listed)
// without yet logging in / acquiring a lock — keeping tool registration side-effect-free.
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { TOOLS } = require("./tools");
const { buildContext } = require("./context");
const pkg = require("../../package.json");

function createServer(getCtx) {
    const server = new McpServer({ name: "palsync", version: pkg.version });
    for (const t of TOOLS) {
        server.registerTool(
            t.name,
            { description: t.description, inputSchema: t.inputShape },
            async (args) => {
                const ctx = await getCtx();
                const res = await t.run(ctx, args || {});
                if (ctx && ctx.lifecycle) ctx.lifecycle.touch(); // reset idle timer on activity
                return { content: [{ type: "text", text: res.message || JSON.stringify(res, null, 2) }] };
            }
        );
    }
    return server;
}

async function main() {
    const workspaceDir = process.env.PALSYNC_WORKSPACE || process.cwd();
    let ctx = null;
    const getCtx = async () => { if (!ctx) ctx = await buildContext(workspaceDir, { log: (m) => process.stderr.write("[palsync-mcp] " + m + "\n") }); return ctx; };
    const server = createServer(getCtx);
    await server.connect(new StdioServerTransport());
    process.stderr.write("[palsync-mcp] serving for workspace " + workspaceDir + "\n");
}

module.exports = { createServer, main, TOOLS };
