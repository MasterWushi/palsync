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

// Walk profile -> group -> pal with back support. Returns { profile, group, pal } or null
// if the user cancels out.
async function runSelection(session, prompts) {
    let step = "profile";
    let profile, group;
    while (true) {
        if (step === "profile") {
            const profiles = await listProfiles(session);
            const choice = await prompts.pickProfile(profiles);
            if (!choice) return null;
            profile = choice;
            step = "group";
        } else if (step === "group") {
            const groups = await listGroups(session, profile.profileId);
            const choice = await prompts.pickGroup(groups);
            if (choice === BACK) { step = "profile"; continue; }
            if (!choice) return null;
            group = choice;
            step = "pal";
        } else { // pal
            const pals = await listPals(session, profile.profileId, group.groupId);
            const choice = await prompts.pickPal(pals);
            if (choice === BACK) { step = "group"; continue; }
            if (!choice) return null;
            return { profile, group, pal: normalizePal(choice) };
        }
    }
}

module.exports = { runSelection, normalizePal, BACK };
