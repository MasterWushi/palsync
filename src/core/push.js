"use strict";
// Headless push for the MCP session. Reuses the proven palpush sequence and the unchanged lib:
// ensure we hold the lock (own-reclaim; never break another's) -> drift guard on
// lastModifiedDate -> inject from disk -> ProcessPalBuilder UPDATE -> update the stored marker.
// Unlike the standalone palpush CLI it does NOT unlock — the MCP session holds the lock until
// exit/idle. The save task is byte-identical to palpush's.
const { Pal } = require("../../lib/pal");
const { CloudPistonAPIManager } = require("../../lib/apiManager");
const { resolveServerPalByGuid } = require("./resolve");
const lock = require("./lock");
const drift = require("./drift");

function buildSaveTask(pal) {
    return {
        "com.contractpal.palbuilder.PalBuilderRequest": {
            pal: pal,
            operation: "UPDATE",
            includeDependencies: false,
            platformMetaData: { palFirst: false }
        }
    };
}

function normalizeValidation(resp) {
    const vr = resp && resp.validationResults;
    if (!vr || vr === "") return [];
    const list = vr["com.contractpal.ValidationResult"];
    if (!list) return [];
    return Array.isArray(list) ? list : [list];
}

// Pushes workspaceDir to the pal identified by record.palGuid. Mutates record.lastModifiedDate
// on success. Returns a result object (never throws on drift/lock — returns a refusal).
async function push(session, record, workspaceDir, { force = false } = {}) {
    // 1) ensure the lock is ours (own-stale auto-reclaim); refuse if held by another user.
    const lk = await lock.acquireByGuid(session, record.palGuid, { force: false });
    if (!lk.acquired) {
        if (lk.heldByOther) return { pushed: false, refused: "locked-by-other", holder: lk.holder, since: lk.sinceText };
        return { pushed: false, refused: "no-lock", reason: lk.reason };
    }
    const id = lk.resolved.id;
    const liveMarker = lk.resolved.lastModifiedDate;

    // 2) drift guard: server saved since our last pull?
    if (drift.serverAdvanced(record.lastModifiedDate, liveMarker) && !force) {
        const li = session.lockInfo;
        const lastEditDate = li && li.lastEditDate && Number.isFinite(Number(li.lastEditDate))
            ? new Date(Number(li.lastEditDate)).toISOString() : null;
        return {
            pushed: false, refused: "drift",
            storedMarker: record.lastModifiedDate, liveMarker,
            lastEditUser: li ? li.lastEditUser : null, lastEditDate
        };
    }

    // 3) inject from disk + save (body pal.id == lock header id, matching the extension invariant)
    const pal = await Pal.fromPath(workspaceDir);
    pal.id = id;
    const injected = await pal.injectFileContent();
    const saveResp = await CloudPistonAPIManager.savePal(session, pal, id);
    const validation = normalizeValidation(saveResp);
    const success = !!(saveResp && saveResp.success);

    // 4) refresh the stored marker (the save advanced it) by re-resolving the guid.
    if (success) {
        const after = await resolveServerPalByGuid(session, record.palGuid);
        record.lastModifiedDate = after ? after.lastModifiedDate : liveMarker;
    }

    return { pushed: success, forced: !!force, filesPushed: injected.length, validation, newMarker: record.lastModifiedDate };
}

module.exports = { push, buildSaveTask, normalizeValidation };
