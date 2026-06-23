"use strict";
// Per-agent context injection: Claude/Codex drive palsync via MCP tools (pal_push, …); Pi has no
// MCP, so its AGENTS.md uses the palsync CLI subcommands instead and drops the session-lock framing.
// Pure (writes to a temp dir, no network). Run: npm test.
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ci = require("../src/launcher/contextInject");

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "palsync-inject-")); }

test("Claude CLAUDE.md uses the MCP tools (unchanged flavor)", async () => {
    const ws = tmp();
    await ci.inject(ws, { palName: "Demo", agent: "claude" });
    const md = fs.readFileSync(path.join(ws, "CLAUDE.md"), "utf8");
    assert.ok(md.includes("`pal_push`"), "should reference the MCP tool pal_push");
    assert.ok(md.includes("MCP server"), "should describe the MCP server");
    assert.ok(!md.includes("`palsync push`"), "should NOT use CLI subcommands");
    fs.rmSync(ws, { recursive: true, force: true });
});

test("Pi AGENTS.md uses the palsync CLI, not MCP", async () => {
    const ws = tmp();
    await ci.inject(ws, { palName: "Demo", agent: "pi" });
    const md = fs.readFileSync(path.join(ws, "AGENTS.md"), "utf8");
    for (const cmd of ["`palsync push`", "`palsync pull`", "`palsync validate`", "`palsync sync-datasets`"]) {
        assert.ok(md.includes(cmd), "Pi AGENTS.md should reference " + cmd);
    }
    assert.ok(!md.includes("`pal_push`"), "Pi must not reference MCP tools");
    assert.ok(!md.includes("MCP server"), "Pi has no MCP server");
    assert.ok(!md.includes("locked for your session"), "Pi locks per-command, not per-session");
    assert.ok(fs.existsSync(path.join(ws, ".agents/skills/palbuilder-backend/SKILL.md")), "Pi gets skills at .agents/");
    fs.rmSync(ws, { recursive: true, force: true });
});
