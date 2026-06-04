"use strict";
// Default interactive menus for the selection flow, via @clack/prompts. Each returns the
// chosen object, the BACK sentinel, or null on cancel. Kept separate from selection.js so the
// stepper logic stays UI-agnostic and testable.
const { loadClack } = require("../platform/uiPrompts");
const { BACK } = require("./selection");

function guard(clack, value) {
    if (clack.isCancel(value)) return null;
    return value;
}

const selectionPrompts = {
    async pickProfile(profiles) {
        const clack = await loadClack();
        return guard(clack, await clack.select({
            message: "Step 1/3 · Select profile",
            options: profiles.map(p => ({ value: p, label: p.profileName }))
        }));
    },
    async pickGroup(groups) {
        const clack = await loadClack();
        return guard(clack, await clack.select({
            message: "Step 2/3 · Select group",
            options: [
                { value: BACK, label: "← Back (profiles)" },
                ...groups.map(g => ({ value: g, label: g.name, hint: g.description || undefined }))
            ]
        }));
    },
    async pickPal(pals) {
        const clack = await loadClack();
        return guard(clack, await clack.select({
            message: "Step 3/3 · Select pal",
            options: [
                { value: BACK, label: "← Back (groups)" },
                ...pals.map(p => ({ value: p, label: p.name, hint: p.description || undefined }))
            ]
        }));
    }
};

module.exports = { selectionPrompts };
