"use strict";
// Default interactive menus for the selection flow. Profile/group/pal use `prompts` autocomplete
// (filter-as-you-type) because pal lists can run to hundreds. `prompts` is CJS and supports Node
// >=6, so it works on the team's Node range (18+) and doesn't touch the @clack pin. Returns the
// chosen object, the BACK sentinel, or null on cancel — kept UI-agnostic from selection.js.
const promptsLib = require("prompts");
const { BACK } = require("./selection");
const { loadClack } = require("../platform/uiPrompts");
const { describeDiff } = require("../core/localDrift");

// Case-insensitive SUBSTRING filter (more forgiving than prompts' default prefix match), so
// typing "tracker" matches "Project Tracker", not just leading text.
function suggest(input, choices) {
    const q = (input || "").toLowerCase();
    return Promise.resolve(choices.filter(c => String(c.title).toLowerCase().includes(q)));
}

async function autocompletePick(message, items, { back = false } = {}) {
    const choices = [];
    if (back) choices.push({ title: "← Back", value: BACK });
    for (const it of items) choices.push(it);

    let cancelled = false;
    const res = await promptsLib(
        { type: "autocomplete", name: "value", message, choices, suggest, limit: 12 },
        { onCancel: () => { cancelled = true; return false; } }
    );
    if (cancelled || res.value === undefined) return null;
    return res.value;
}

const selectionPrompts = {
    async pickProfile(profiles) {
        return autocompletePick(
            "Step 1/3 · Select profile (type to filter)",
            profiles.map(p => ({ title: p.profileName, value: p }))
        );
    },
    async pickGroup(groups) {
        return autocompletePick(
            "Step 2/3 · Select group (type to filter)",
            groups.map(g => ({ title: g.name, description: g.description || undefined, value: g })),
            { back: true }
        );
    },
    async pickPal(pals) {
        return autocompletePick(
            "Step 3/3 · Select pal (type to filter)",
            pals.map(p => ({ title: p.name, description: p.description || undefined, value: p })),
            { back: true }
        );
    }
};

// The launcher's un-pushed-changes prompt (the data-loss guard UI). Called by
// workspace.setup() via the injectable onDrift hook; returns one of
// "push" | "force-push" | "overwrite" | "skip" | "abort".
async function driftPrompt(info) {
    const clack = await loadClack();
    if (info.phase === "push-refused") {
        const r = info.refusal || {};
        if (r.refused === "drift") {
            clack.log.warn(
                "The push was refused: the SERVER also changed since your last pull (saved by " +
                (r.lastEditUser || "unknown") + (r.lastEditDate ? " at " + r.lastEditDate : "") + ").\n" +
                "Local and server have BOTH moved — force-pushing overwrites their save; pulling overwrites yours."
            );
            const v = await clack.select({
                message: "Both sides changed — how do you want to resolve it?",
                options: [
                    { value: "merge", label: "Merge — keep BOTH sides' changes where they don't collide (recommended)" },
                    { value: "skip", label: "Skip the pull — keep my local state, decide later" },
                    { value: "force-push", label: "Force-push MY local changes (overwrites their server save)" },
                    { value: "overwrite", label: "Pull THEIR server state (overwrites my local changes)" },
                    { value: "abort", label: "Quit palsync" }
                ]
            });
            return clack.isCancel(v) ? "abort" : v;
        }
        clack.log.warn("The push was refused (" + (r.refused || "unknown") + ")" +
            (r.holder ? " — the pal is locked by " + r.holder : "") + ".");
        const v = await clack.select({
            message: "Couldn't push your local changes — what now?",
            options: [
                { value: "skip", label: "Skip the pull — keep my local state (safest)" },
                { value: "overwrite", label: "Pull anyway — overwrite my local changes" },
                { value: "abort", label: "Quit palsync" }
            ]
        });
        return clack.isCancel(v) ? "abort" : v;
    }
    clack.log.warn(
        "This workspace has UN-PUSHED local changes (the last session likely ended before a push):\n" +
        describeDiff(info.diff) +
        "\nPulling now would overwrite the modified/deleted files listed above. New local files are safe either way."
    );
    const v = await clack.select({
        message: "Un-pushed local changes in " + (info.palName || "this pal") + " — what do you want to do?",
        options: [
            { value: "push", label: "Push my local changes to the server first, then pull (recommended)" },
            { value: "merge", label: "Merge — combine my changes with the server's where they don't collide" },
            { value: "skip", label: "Skip the pull — work on the local state as-is" },
            { value: "overwrite", label: "Pull anyway — OVERWRITE the local changes listed above" },
            { value: "abort", label: "Quit palsync" }
        ]
    });
    return clack.isCancel(v) ? "abort" : v;
}

module.exports = { selectionPrompts, suggest, autocompletePick, driftPrompt };
