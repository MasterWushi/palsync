#!/usr/bin/env node
"use strict";
// palsync — the terminal launcher. Logs in, selects a pal, pulls + locks + injects context +
// registers the MCP server, then opens Claude Code in the workspace. No vscode, no env vars
// (credentials live in the OS keychain).
const preflight = require("../src/preflight");
const { loadClack } = require("../src/platform/uiPrompts");
const { run } = require("../src/launcher/index");
const pkg = require("../package.json");

// --version / -v: print the build and exit (works regardless of Node/Claude prereqs, so QA and
// the team can report exactly which build they're on). Handled before anything else.
const argv = process.argv.slice(2);
if (argv.includes("--version") || argv.includes("-v")) {
    process.stdout.write("palsync " + pkg.version + "\n");
    process.exit(0);
}

// Subcommands: `palsync push|pull|status` — headless sync that needs NO MCP server and NO agent
// (the recovery path when a session ends before a push, and a plain terminal workflow). They
// skip the launcher preflight entirely: no Claude/Codex required, just .palsync.json + keychain.
const SUBCOMMANDS = ["push", "pull", "status", "test", "preview", "validate", "sync-datasets"];
if (SUBCOMMANDS.includes(argv[0])) {
    require("../src/cli/syncCommands").run(argv[0], argv.slice(1))
        .then(code => process.exit(code))
        .catch(err => {
            process.stderr.write("palsync " + argv[0] + " failed: " + (err && err.message ? err.message : err) + "\n");
            process.exit(1);
        });
    return; // launcher flow below never runs for subcommands
}

// `palsync setup` — NON-INTERACTIVE workspace creation (headless / autonomous boxes). Has its
// own module + flags (incl. --agent), so it's dispatched before the interactive launcher's
// flag parsing. No preflight (no agent binary required just to prepare a workspace).
if (argv[0] === "setup") {
    require("../src/cli/setupCommand").run(argv.slice(1))
        .then(code => process.exit(code))
        .catch(err => {
            process.stderr.write("palsync setup failed: " + (err && err.message ? err.message : err) + "\n");
            process.exit(1);
        });
    return;
}
if (argv[0] === "help" || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
        "palsync — PalBuilder + AI agents\n\n" +
        "  palsync                 launch: login → pick pal → pull+lock → inject skills → open agent\n" +
        "  palsync setup --pal \"<name>\"   headless workspace creation (no prompts; for autonomous/agent boxes)\n" +
        "  palsync push|pull|status|test|preview|validate|sync-datasets   headless ops for a workspace (no MCP/agent needed)\n" +
        "  palsync --with-design   inject the design system for UI work\n" +
        "  palsync --agent codex   use Codex instead of Claude Code\n" +
        "  palsync --version       print the build\n\n" +
        require("../src/cli/syncCommands").USAGE + "\n"
    );
    process.exit(0);
}

// --with-design / -d: opt in to injecting the Nimblewire design system (design-core) for UI work.
// Default OFF so backend/bugfix sessions stay lean. Parsed here, threaded through run() → setup().
const withDesign = argv.includes("--with-design") || argv.includes("-d");

// --agent <claude|codex>: choose the coding agent. Default Claude Code (and, when the flag is
// absent, the interactive picker still runs — agentFlag stays undefined). Threaded through
// preflight (which agent's binary to check) and run() → setup() (injection + MCP destinations).
function parseAgentFlag(args) {
    let val;
    const i = args.indexOf("--agent");
    if (i !== -1) val = args[i + 1];
    else { const eq = args.find(a => a.startsWith("--agent=")); if (eq) val = eq.slice("--agent=".length); }
    if (val === undefined) return undefined; // no flag → default flow (interactive picker)
    val = String(val).toLowerCase();
    if (val !== "claude" && val !== "codex") {
        process.stderr.write("Unknown --agent '" + val + "'. Use: claude (default) or codex.\n");
        process.exit(1);
    }
    return val;
}
const agentFlag = parseAgentFlag(argv);

(async () => {
    await preflight.run({ agent: agentFlag || "claude" }); // Node >= 18 + the chosen agent's CLI
    const clack = await loadClack(); // @clack/prompts is ESM-only; dynamic import works on Node 18+
    clack.intro("palsync — PalBuilder + Claude Code");
    const result = await run({ withDesign, agent: agentFlag, log: (m) => clack.log.step(m) });
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
