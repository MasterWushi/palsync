"use strict";
// Resolve a pal's CURRENT server lock id + drift marker from its stable GUID, by
// enumerating getProfileList -> getGroupList -> getPalList. The 64-hex id rotates per
// enumeration (never cache it); the guid is stable. lastModifiedDate (PalInfoEx) is the
// confirmed drift marker — it advances only on a real server save. Factored out of the
// proven palpush --guid resolver; reuses the unchanged apiManager.
const { CloudPistonAPIManager } = require("../../lib/apiManager");

// CloudPiston sql-timestamp nodes parse as { _text, _class }. Pull the text out.
function timestampText(node) {
    if (node == null) return null;
    if (typeof node === "string") return node;
    if (typeof node === "object" && node._text !== undefined) return String(node._text);
    return String(node);
}

async function resolveServerPalByGuid(session, guid) {
    const profileResp = await CloudPistonAPIManager.getProfileList(session);
    const profiles = (profileResp && profileResp.profileList && profileResp.profileList["com.contractpal.pal.ProfileInfo"]) || [];
    for (const profile of profiles) {
        const groupResp = await CloudPistonAPIManager.getGroupList(session, profile.profileId);
        const groups = (groupResp && groupResp.groupList && groupResp.groupList["com.contractpal.pal.GroupInfo"]) || [];
        for (const group of groups) {
            const palResp = await CloudPistonAPIManager.getPalList(session, profile.profileId, group.groupId, { includeTest: true, includeInstalled: true });
            const pals = (palResp && palResp.palInfoList && palResp.palInfoList.PalInfoEx) || [];
            const match = pals.find(p => p.guid === guid);
            if (match) {
                return {
                    id: match.id,
                    guid: match.guid,
                    name: match.name,
                    description: match.description,
                    lastModifiedDate: timestampText(match.lastModifiedDate),
                    profileId: profile.profileId,
                    profileName: profile.profileName,
                    groupId: group.groupId,
                    groupName: group.name
                };
            }
        }
    }
    return null;
}

module.exports = { resolveServerPalByGuid, timestampText };
