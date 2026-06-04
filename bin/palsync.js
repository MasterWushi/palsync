#!/usr/bin/env node
"use strict";
// palsync — the terminal launcher. Logs in, selects a pal, pulls + locks + injects context +
// registers the MCP server, then opens Claude Code in the workspace. No vscode, no env vars
// (credentials live in the OS keychain).
const preflight = require("../src/preflight");
const { loadClack } = require("../src/platform/uiPrompts");
const { run } = require("../src/launcher/index");

(async () => {
    await preflight.run(); // Node >= 18 (guide) + Claude Code (auto-install on consent) before anything else
    const clack = await loadClack(); // @clack/prompts is ESM-only; dynamic import works on Node 18+
    clack.intro("palsync — PalBuilder + Claude Code");
    const result = await run({ log: (m) => clack.log.step(m) });
    if (!result) { clack.cancel("Cancelled."); process.exit(1); }
    clack.log.info(
        "Creatable here: pages, fragments, scripts, emails, images, styles, attachments.\n" +
        "Workflows, documents, fonts, and datasets/dataviews must be made in PalBuilder (palsync can still edit them). See README."
    );
    clack.outro("Workspace ready at " + result.workspaceDir + " — handing off to " + result.agent.label + ".");
    // If we launched the agent, keep the process alive until it exits so the terminal is handed over.
    if (result.child) {
        result.child.on("exit", (code) => process.exit(code || 0));
    } else {
        process.exit(0);
    }
})().catch(err => {
    process.stderr.write("palsync failed: " + (err && err.stack ? err.stack : err) + "\n");
    process.exit(1);
});
