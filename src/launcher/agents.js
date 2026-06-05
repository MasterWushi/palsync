"use strict";
// Agent registry + launch. v1 ships Claude Code only, but the registry is structured so other
// MCP-capable agents (Cline, Cursor) can slot in later (decision 3) — we only ever show agents
// we can actually fulfil. Launch spawns the agent CLI in the workspace, inheriting the terminal
// (portable handoff); on Windows we go through the shell so `claude.cmd` resolves.
const { spawn } = require("child_process");

const AGENTS = [
    // `available` controls the interactive picker only. Claude Code is the default, menu-listed
    // agent; Codex is reachable via the explicit `--agent codex` flag (resolve()) but not yet
    // surfaced in the picker. `key` is the --agent flag value.
    { id: "claude-code", key: "claude", label: "Claude Code", command: "claude", args: [], available: true },
    { id: "codex", key: "codex", label: "Codex", command: "codex", args: [], available: false }
    // future: { id: "cline", ..., available: false }, { id: "cursor", ..., available: false }
];

function available() {
    return AGENTS.filter(a => a.available);
}

// Resolve an explicit --agent value ("claude" | "codex" | an id) to a descriptor, or null.
// Works regardless of `available` so opt-in agents are reachable by flag before they're menu-listed.
function resolve(key) {
    if (!key) return null;
    const k = String(key).toLowerCase();
    return AGENTS.find(a => a.key === k || a.id === k) || null;
}

// Default interactive pick (single live option in v1). Returns an agent descriptor.
async function pick(prompt) {
    const opts = available();
    if (prompt) return prompt(opts);
    const { loadClack } = require("../platform/uiPrompts");
    const clack = await loadClack();
    const choice = await clack.select({
        message: "Open with which agent?",
        options: opts.map(a => ({ value: a.id, label: a.label }))
    });
    if (clack.isCancel(choice)) return null;
    return opts.find(a => a.id === choice);
}

// Spawn the agent in the workspace, handing over the terminal. Returns the child process.
function launch(agent, { cwd, stdio = "inherit" } = {}) {
    const useShell = process.platform === "win32"; // resolve .cmd shims on Windows
    const child = spawn(agent.command, agent.args, { cwd, stdio, shell: useShell });
    child.on("error", (err) => {
        if (err && err.code === "ENOENT") {
            process.stderr.write(
                "\nCould not launch '" + agent.command + "'. Make sure " + agent.label + " is installed and on PATH.\n" +
                "Your workspace is ready — open it manually:  cd " + cwd + " && " + agent.command + "\n"
            );
        } else {
            process.stderr.write("\nFailed to launch agent: " + (err && err.message ? err.message : err) + "\n");
        }
    });
    return child;
}

module.exports = { AGENTS, available, pick, launch, resolve };
