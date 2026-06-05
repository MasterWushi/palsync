"use strict";
// The palsync launcher: cloud → login → profile → group → pal → agent → setup → open Claude Code.
// All interactive steps are injectable so the flow is testable headlessly; defaults use the real
// @clack/prompts UI. autoLaunch=false stops before opening the agent (used by tests).
const { loadClack } = require("../platform/uiPrompts");
const { login } = require("../auth/credentials");
const { runSelection } = require("./selection");
const { selectionPrompts } = require("./prompts");
const agents = require("./agents");
const workspace = require("./workspace");

async function defaultChooseDir(defaultDir) {
    const clack = await loadClack();
    const v = await clack.text({ message: "Workspace directory", initialValue: defaultDir });
    if (clack.isCancel(v) || !v) return null;
    return v;
}

// Orchestrate the whole flow. Returns { workspaceDir, setupResult, agent, child } or null on cancel.
async function run({
    loginPrompts,
    selectionPrompts: selPrompts = selectionPrompts,
    pickAgent,
    chooseWorkspaceDir = defaultChooseDir,
    autoLaunch = true,
    withDesign = false,
    log = () => {}
} = {}) {
    // 1–2. cloud + login (cached creds skip the prompt)
    const { session, cloudUrl } = await login({ prompts: loginPrompts });
    log("logged in: " + session.username + " @ " + cloudUrl + " (userId=" + session.userId + ")");

    // 3. profile → group → pal
    const sel = await runSelection(session, selPrompts);
    if (!sel) { log("cancelled at selection"); return null; }
    log("selected pal: " + sel.pal.name + " (" + sel.pal.guid + ")");

    // 4. agent
    const agent = await agents.pick(pickAgent);
    if (!agent) { log("cancelled at agent"); return null; }
    log("agent: " + agent.label);

    // 5. workspace dir + setup (pull + lock + inject + .palsync.json + register MCP)
    const dir = await chooseWorkspaceDir(workspace.defaultWorkspaceDir(sel.pal.name), sel.pal);
    if (!dir) { log("cancelled at workspace dir"); return null; }
    const setupResult = await workspace.setup({ session, cloudUrl, sel, workspaceDir: dir, withDesign, log });

    // 6. open the agent in the workspace (handoff). Lock stays held; MCP server owns release.
    let child = null;
    if (autoLaunch) {
        log("opening " + agent.label + " in " + dir);
        child = agents.launch(agent, { cwd: dir });
    }

    return { workspaceDir: dir, setupResult, agent, child };
}

module.exports = { run };
