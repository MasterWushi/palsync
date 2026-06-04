"use strict";
// Default interactive menus for the selection flow. Profile/group/pal use `prompts` autocomplete
// (filter-as-you-type) because pal lists can run to hundreds. `prompts` is CJS and supports Node
// >=6, so it works on the team's Node range (18+) and doesn't touch the @clack pin. Returns the
// chosen object, the BACK sentinel, or null on cancel — kept UI-agnostic from selection.js.
const promptsLib = require("prompts");
const { BACK } = require("./selection");

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

module.exports = { selectionPrompts, suggest, autocompletePick };
