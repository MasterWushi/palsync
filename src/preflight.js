"use strict";
// Startup preflight for the palsync launcher. Verifies the environment BEFORE any login or
// hand-off, so a missing prerequisite produces a clear, actionable message instead of a cryptic
// failure at the Claude Code launch. Pure packaging/UX — touches no launcher/MCP/sync logic.
const { spawnSync } = require("child_process");

const MIN_NODE_MAJOR = 18;

function nodeMajor() {
    return parseInt(process.versions.node.split(".")[0], 10);
}

// Cross-platform "is this command on PATH?": `where` on Windows, `which` elsewhere.
function commandOnPath(name) {
    const probe = process.platform === "win32" ? "where" : "which";
    try {
        return spawnSync(probe, [name], { stdio: "ignore" }).status === 0;
    } catch (e) {
        return false;
    }
}

function nodeMessage() {
    return [
        "✖ palsync needs Node.js " + MIN_NODE_MAJOR + " or newer (you have " + process.version + ").",
        "  Install the latest LTS from https://nodejs.org/ (or via nvm / fnm / volta), then re-run palsync."
    ].join("\n");
}

function claudeMessage() {
    return [
        "✖ Claude Code (the `claude` command) was not found on your PATH.",
        "  palsync hands off to Claude Code after setup, so it is required.",
        "  Install it:  npm install -g @anthropic-ai/claude-code",
        "  Docs:        https://docs.claude.com/en/docs/claude-code",
        "  Then make sure `claude` runs in your terminal and re-run palsync."
    ].join("\n");
}

// Returns an array of problem messages (empty = all good).
function checkProblems() {
    const problems = [];
    if (nodeMajor() < MIN_NODE_MAJOR) problems.push(nodeMessage());
    if (!commandOnPath("claude")) problems.push(claudeMessage());
    return problems;
}

// Run the preflight; on failure print all problems and exit cleanly (code 1).
function run() {
    const problems = checkProblems();
    if (problems.length > 0) {
        process.stderr.write("\npalsync can't start — please fix the following:\n\n" + problems.join("\n\n") + "\n\n");
        process.exit(1);
    }
}

module.exports = { run, checkProblems, nodeMessage, claudeMessage, commandOnPath, MIN_NODE_MAJOR };
