"use strict";
// Headless push for the MCP session. Reuses the proven palpush sequence and the unchanged lib:
// ensure we hold the lock (own-reclaim; never break another's) -> drift guard on
// lastModifiedDate -> inject from disk -> ProcessPalBuilder UPDATE -> update the stored marker.
// Unlike the standalone palpush CLI it does NOT unlock — the MCP session holds the lock until
// exit/idle. The save task is byte-identical to palpush's.
const fs = require("fs");
const path = require("path");
const { Pal } = require("../../lib/pal");
const { CloudPistonAPIManager } = require("../../lib/apiManager");
const { resolveServerPalByGuid } = require("./resolve");
const lock = require("./lock");
const drift = require("./drift");

// Types that CANNOT be created via push: the server rejects a NEW entry of these types and the
// rejection fails the WHOLE save transactionally (workflows: "Unknown workflow"; documents: need
// a description + valid XML; fonts: rejected outright). Editing EXISTING ones is fine. CLAUDE.md
// tells Claude not to create them — this is the backstop so a stray addition can't sink a push.
const UNCREATABLE = [
    { key: "workflows", folder: "workflows" },
    { key: "documents", folder: "documents" },
    { key: "fonts", folder: "fonts" }
];

function isFile(p) { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }

// Best-effort: the set of entry-strings the server already has, per uncreatable type. Used to tell
// a NEW (uncreatable) entry from an existing one we may legitimately edit. Returns null on failure
// (caller then skips stripping rather than risk dropping a valid existing entry).
async function fetchServerKnown(session, palId) {
    try {
        const resp = await CloudPistonAPIManager.getPal(session, palId);
        const sp = resp && resp.pal;
        if (!sp) return null;
        const setOf = (k) => new Set((((sp[k] && sp[k].entry)) ? (Array.isArray(sp[k].entry) ? sp[k].entry : [sp[k].entry]) : []).map(e => e.string));
        return { workflows: setOf("workflows"), documents: setOf("documents"), fonts: setOf("fonts") };
    } catch (e) { return null; }
}

// Strip NEW entries of uncreatable types from the payload (keep server-known ones so edits work),
// and report stray on-disk files of those types. Mutates pal. Returns [{type, file, reason}].
function guardUncreatableTypes(pal, workspaceDir, serverKnown) {
    const skipped = [];
    for (const t of UNCREATABLE) {
        const known = (serverKnown && serverKnown[t.key]) || new Set();
        const node = pal[t.key] && pal[t.key].entry;
        // (1) strip new entries (only when we have a baseline; otherwise leave them and let the
        //     server's transactional rejection protect us — never risk dropping a valid entry)
        if (serverKnown && Array.isArray(node)) {
            pal[t.key].entry = node.filter(e => {
                if (known.has(e.string)) return true;
                skipped.push({ type: t.key, file: e.string, reason: "new entry — not creatable via push (use the PalBuilder GUI)" });
                return false;
            });
        }
        // (2) report stray files on disk with no manifest entry (already excluded; informational)
        const manifest = new Set(((pal[t.key] && pal[t.key].entry) || []).map(e => e.string));
        let files = [];
        try { files = fs.readdirSync(path.join(workspaceDir, t.folder)).filter(f => isFile(path.join(workspaceDir, t.folder, f))); } catch (e) {}
        for (const f of files) if (!manifest.has(f) && !known.has(f)) skipped.push({ type: t.key, file: f, reason: "stray file — not pushed (use the PalBuilder GUI)" });
    }
    return skipped;
}

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
async function push(session, record, workspaceDir, { force = false, overrideLock = false } = {}) {
    // 1) ensure the lock is ours. acquireByGuid reads the real holder from teamInfo and reports a
    //    blocked reason (gui-lock-self / gui-lock-other / override-disabled / unknown-holder).
    //    overrideLock only attempts Lock-Force, which is itself gated by OVERRIDE_ENABLED in lock.js.
    const lk = await lock.acquireByGuid(session, record.palGuid, { force: !!overrideLock });
    if (!lk.acquired) {
        return { pushed: false, refused: lk.blocked || "no-lock", holder: lk.holder, since: lk.since };
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
    // Backstop: strip any NEW entry of an uncreatable type (workflows/documents/fonts) so it can't
    // sink the whole push; report stray files of those types. Creatable types are never touched.
    const serverKnown = await fetchServerKnown(session, id);
    const skipped = guardUncreatableTypes(pal, workspaceDir, serverKnown);
    const injected = await pal.injectFileContent();
    const saveResp = await CloudPistonAPIManager.savePal(session, pal, id);
    const validation = normalizeValidation(saveResp);
    const success = !!(saveResp && saveResp.success);

    // 4) refresh the stored marker (the save advanced it) by re-resolving the guid.
    if (success) {
        const after = await resolveServerPalByGuid(session, record.palGuid);
        record.lastModifiedDate = after ? after.lastModifiedDate : liveMarker;
    }

    return { pushed: success, forced: !!force, filesPushed: injected.length, validation, newMarker: record.lastModifiedDate, skipped };
}

module.exports = { push, buildSaveTask, normalizeValidation };
