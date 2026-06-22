"use strict";
// Create a brand-new pal via CreatePalFromBuilder.do. The body is a PalInfoEx (extends
// PalInfo) carrying an empty `importPal` shell — the server mints the pal and returns its
// id + guid. Single source of truth for the wire body (the create-pal probe imports
// buildPalInfoEx too, so the probe and the launcher never drift).
//
// Conventions fixed by the platform / spec:
//   - guid is NOT sent (null) — the create process mints + returns it.
//   - groupIds is required, non-null, >= 1 entry (server rejects null).
//   - modes default all-true: a single pal can be multiple types (console/web/transaction).
//   - description and category default to the name when the user leaves them blank.
const { CloudPistonAPIManager } = require("../../lib/apiManager");

// Format a Date for the server's XStream DateConverter, whose pattern is
// "yyyy-MM-dd HH:mm:ss.S z" — the trailing timezone token is REQUIRED (omitting it gives
// "Cannot parse date ..."). Emit the time in UTC with a literal " GMT" so it always parses.
function xstreamDate(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate()) + " " +
        p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + ":" + p(d.getUTCSeconds()) + "." +
        d.getUTCMilliseconds() + " GMT";
}

// Build the PalInfoEx body object (the inner object; apiManager wraps it in the root
// element). groupIds serializes as the XStream String[] shape: <groupIds><string>..</string>.
// `now` is injectable so tests are deterministic; createDate + lastModifiedDate are stamped to it.
function buildPalInfoEx({ name, description, category, groupIds, activationKeyId, now = new Date() }) {
    if (!name) throw new Error("createPal: name is required");
    if (!groupIds || !groupIds.length) throw new Error("createPal: at least one groupId is required");
    const ts = xstreamDate(now);
    const body = {
        name: name,
        description: description || name,
        category: category || name,
        createDate: ts,
        lastModifiedDate: ts,
        modeConsole: true,
        modeWeb: true,
        modeTransaction: true,
        deployed: false,
        shadow: false,
        shell: false,
        repository: false,
        skin: false,
        consoleControlled: false,
        groupAccessOnly: false,
        module: false,
        draggable: false,
        auditDocumentView: false,
        groupIds: { string: groupIds },
        // Empty shell — server creates a bare pal; suppressEmptyNode drops the empty collections.
        importPal: { layout: { name: name, category: category || name, description: description || name } }
    };
    // activationKeyId is required by the server; included only when known (createNewPal fetches it).
    if (activationKeyId) body.activationKeyId = activationKeyId;
    return body;
}

// Pull the activation keys out of a GetKeysForBuilder result. They follow the deployment
// shape — a list of com.contractpal.NameValue ({ name, value }); the parser marks
// "activationKeys" as always-array. Returns [{ name, value }, ...].
function extractKeys(resp) {
    if (!resp || !resp.success) return [];
    let arr = resp.activationKeys || resp.keys || resp.keyList || resp.customObject;
    if (arr && typeof arr === "object" && arr["com.contractpal.NameValue"]) arr = arr["com.contractpal.NameValue"];
    if (!arr || arr === "") return [];
    if (!Array.isArray(arr)) arr = [arr];
    return arr.map(k => {
        const nv = (k && k["com.contractpal.NameValue"]) || k;
        return { name: nv && nv.name, value: nv && nv.value !== undefined ? nv.value : nv };
    });
}

// Pull the new pal's id + guid out of the create result. The response carries the newly
// created PalInfoEx (with a non-null, server-minted guid like "PAL-SE-...") under
// `customObject` (_class:"PalInfoEx"). Extra fallbacks + array-unwrap guard against envelope
// differences (the parser marks bare "PalInfoEx" as an always-array tag).
function extractCreated(resp) {
    if (!resp || !resp.success) {
        const reason = resp ? JSON.stringify(resp) : "no response (empty body / declined)";
        throw new Error("CreatePalFromBuilder failed: " + reason);
    }
    let info = resp.customObject || resp.PalInfoEx || resp.palInfo || (resp.palInfoList && resp.palInfoList.PalInfoEx) || resp.pal;
    if (Array.isArray(info)) info = info[0];
    const guid = info && info.guid;
    if (!guid) throw new Error("CreatePalFromBuilder returned no guid: " + JSON.stringify(resp));
    return { id: info.id, guid: guid, name: info.name };
}

// Create the pal and return { id, guid, name }. profileId is sent as a header; groupIds in
// the body. No lock (the pal does not exist yet). When no activationKeyId is supplied, fetch
// the profile's keys and use the first (the create-pal wizard's default).
async function createNewPal(session, { profileId, groupIds, name, description, category, activationKeyId }) {
    if (!profileId) throw new Error("createPal: profileId is required");
    if (!activationKeyId) {
        const keysResp = await CloudPistonAPIManager.getKeysForBuilder(session, profileId);
        const keys = extractKeys(keysResp);
        if (!keys.length) {
            throw new Error("No activation keys available for this profile (GetKeysForBuilder): " + JSON.stringify(keysResp));
        }
        activationKeyId = keys[0].value;
    }
    const palInfoEx = buildPalInfoEx({ name, description, category, groupIds, activationKeyId });
    const resp = await CloudPistonAPIManager.createPal(session, profileId, palInfoEx);
    return extractCreated(resp);
}

module.exports = { buildPalInfoEx, extractKeys, createNewPal, extractCreated };
