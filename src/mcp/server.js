"use strict";
// The palsync MCP server: registers the five tools and serves them over stdio. Tool handlers
// resolve their ctx lazily via getCtx() so the server can be constructed (and its tools listed)
// without yet logging in / acquiring a lock — keeping tool registration side-effect-free.
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { TOOLS } = require("./tools");
const { buildContext } = require("./context");
const pkg = require("../../package.json");

// All server diagnostics go to stderr with a consistent prefix. The agent talks over stdio
// (stdin/stdout); stderr is the ONLY safe channel for logs, and it must be LOUD — a silent
// failure is what made the original disconnect undiagnosable.
function logErr(msg) { process.stderr.write("[palsync-mcp] " + msg + "\n"); }
function stackOf(err) { return err && err.stack ? err.stack : String(err); }

function createServer(getCtx) {
    const server = new McpServer({ name: "palsync", version: pkg.version });
    for (const t of TOOLS) {
        server.registerTool(
            t.name,
            { description: t.description, inputSchema: t.inputShape },
            async (args) => {
                // Belt-and-suspenders: the MCP SDK already wraps handlers, but we catch here too so
                // every tool failure is LOGGED with its tool name + full stack (the SDK swallows the
                // stack into a terse result), and the agent still gets a clean error result.
                try {
                    const ctx = await getCtx();
                    const res = await t.run(ctx, args || {});
                    if (ctx && ctx.lifecycle) ctx.lifecycle.touch(); // reset idle timer on activity
                    return { content: [{ type: "text", text: res.message || JSON.stringify(res, null, 2) }] };
                } catch (err) {
                    logErr("tool '" + t.name + "' failed: " + stackOf(err));
                    return { isError: true, content: [{ type: "text", text: "palsync tool '" + t.name + "' failed: " + (err && err.message ? err.message : String(err)) }] };
                }
            }
        );
    }
    return server;
}

// Process-level safety net. ASYMMETRIC on purpose:
//   - unhandledRejection: usually a stray background reject (e.g. a failed idle-release) — the
//     server is still healthy, so LOG LOUDLY and KEEP SERVING. Never swallow: a recurring reject
//     must stay visible in stderr so it can be diagnosed, not papered over.
//   - uncaughtException: process state may be corrupt — a logged clean exit(1) beats limping on.
function installProcessGuards() {
    process.on("unhandledRejection", (reason) => {
        logErr("UNHANDLED REJECTION (kept alive — server still serving): " + stackOf(reason));
    });
    process.on("uncaughtException", (err) => {
        logErr("UNCAUGHT EXCEPTION (exiting cleanly — process state may be unsafe): " + stackOf(err));
        process.exit(1);
    });
}

async function main() {
    installProcessGuards();
    const workspaceDir = process.env.PALSYNC_WORKSPACE || process.cwd();
    let ctx = null;
    const getCtx = async () => { if (!ctx) ctx = await buildContext(workspaceDir, { log: logErr }); return ctx; };
    const server = createServer(getCtx);

    const transport = new StdioServerTransport();
    // EPIPE et al.: if the client end hiccups, a stream 'error' with no listener becomes an
    // uncaughtException. Degrade gracefully — log it, don't crash the session over a write blip.
    transport.onerror = (err) => logErr("stdio transport error: " + stackOf(err));
    process.stdout.on("error", (err) => logErr("stdout stream error (" + (err && err.code ? err.code : "?") + "): " + stackOf(err)));

    await server.connect(transport);
    logErr("serving for workspace " + workspaceDir);
}

module.exports = { createServer, main, installProcessGuards, TOOLS };
