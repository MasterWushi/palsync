"use strict";
// Interactive pal selection: getProfileList -> getGroupList -> getPalList as navigable menus
// with back-navigation (mirrors the extension's pullPal.js wizard). Returns the chosen pal's
// transient id, stable GUID, name, and lastModifiedDate (the drift marker). Prompts are
// injectable (real UI in launcher/prompts.js) so the flow is testable headlessly.
const { CloudPistonAPIManager } = require("../../lib/apiManager");
const { timestampText } = require("../core/resolve");

const BACK = "__back__";

async function listProfiles(session) {
    const resp = await CloudPistonAPIManager.getProfileList(session);
    if (!resp || !resp.success) throw new Error("getProfileList failed");
    return (resp.profileList && resp.profileList["com.contractpal.pal.ProfileInfo"]) || [];
}

async function listGroups(session, profileId) {
    const resp = await CloudPistonAPIManager.getGroupList(session, profileId);
    if (!resp || !resp.success) throw new Error("getGroupList failed");
    return (resp.groupList && resp.groupList["com.contractpal.pal.GroupInfo"]) || [];
}

async function listPals(session, profileId, groupId) {
    const resp = await CloudPistonAPIManager.getPalList(session, profileId, groupId);
    if (!resp || !resp.success) throw new Error("getPalList failed");
    return (resp.palInfoList && resp.palInfoList.PalInfoEx) || [];
}

// Normalize a PalInfoEx into the fields palsync cares about.
function normalizePal(p) {
    return {
        id: p.id,                                  // transient — used now for getPal/lock, never persisted
        guid: p.guid,                              // stable — persisted in .palsync.json
        name: p.name,
        description: p.description,
        lastModifiedDate: timestampText(p.lastModifiedDate)  // drift marker
    };
}

// Walk profile -> [open existing | create new] with back support.
//   open:   profile -> group (single) -> pal   -> { mode:"open",   profile, group, pal }
//   create: profile -> groups (1+)   -> details -> { mode:"create", profile, groups, details }
// Returns null if the user cancels out. No mutations here — the orchestrator performs the
// create (CreatePalFromBuilder) so this stays pure prompts + GET-list calls.
async function runSelection(session, prompts) {
    let step = "profile";
    let profile, group, groups;
    while (true) {
        if (step === "profile") {
            const profiles = await listProfiles(session);
            const choice = await prompts.pickProfile(profiles);
            if (!choice) return null;
            profile = choice;
            step = "mode";
        } else if (step === "mode") {
            const choice = await prompts.pickMode();
            if (choice === BACK) { step = "profile"; continue; }
            if (!choice) return null;
            step = choice === "create" ? "groups" : "group";
        } else if (step === "group") {           // open existing — single group
            const all = await listGroups(session, profile.profileId);
            const choice = await prompts.pickGroup(all);
            if (choice === BACK) { step = "mode"; continue; }
            if (!choice) return null;
            group = choice;
            step = "pal";
        } else if (step === "pal") {
            const pals = await listPals(session, profile.profileId, group.groupId);
            const choice = await prompts.pickPal(pals);
            if (choice === BACK) { step = "group"; continue; }
            if (!choice) return null;
            return { mode: "open", profile, group, pal: normalizePal(choice) };
        } else if (step === "groups") {          // create new — one or more groups
            const all = await listGroups(session, profile.profileId);
            const choice = await prompts.pickGroups(all);
            if (choice === BACK) { step = "mode"; continue; }
            if (!choice || !choice.length) return null;
            groups = choice;
            step = "details";
        } else { // details — name, description, category (desc/category default to name)
            const choice = await prompts.pickNewPalDetails();
            if (choice === BACK) { step = "groups"; continue; }
            if (!choice) return null;
            return { mode: "create", profile, groups, details: choice };
        }
    }
}

module.exports = { runSelection, normalizePal, BACK };
