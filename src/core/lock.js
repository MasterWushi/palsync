"use strict";
// Lock acquire/release/interpret, by stable GUID (resolves a fresh transient id each call).
// Reuses the unchanged apiManager. Ownership is decided by matching the server's lockUser
// against our username — NOT the extension's lockGranted flag, which is buggy
// (Boolean("false") === true). Confirmed server behavior: the same user re-locking an
// already-held lock is granted again, so own-stale-lock reclaim is automatic (no force);
// a lock held by another user must be shown and never force-broken.
const { CloudPistonAPIManager } = require("../../lib/apiManager");
const { resolveServerPalByGuid } = require("./resolve");

// Pure: given a parsed lockInfo + our username, who holds it and is it us?
function interpretLock(lockInfo, ourUsername) {
    const holder = lockInfo && lockInfo.lockUser ? String(lockInfo.lockUser) : null;
    const ours = !!(holder && ourUsername && holder.includes(ourUsername));
    let since = null;
    const ms = lockInfo && lockInfo.lockDate ? Number(lockInfo.lockDate) : NaN;
    if (Number.isFinite(ms) && ms > 0) since = new Date(ms);
    return { holder, ours, since };
}

function sinceText(date) {
    return date ? date.toISOString() : "unknown time";
}

// Acquire the lock for a pal by GUID. force=true sends Lock-Force (only ever used to reclaim
// OUR OWN lock — never another user's). Returns a status object; on heldByOther it clears
// session.lockInfo so we can never accidentally unlock someone else's lock.
async function acquireByGuid(session, guid, { force = false } = {}) {
    const resolved = await resolveServerPalByGuid(session, guid);
    if (!resolved) throw new Error("GUID " + guid + " not found on " + session.environment.url);

    await CloudPistonAPIManager.lockPal(session, resolved.id, force); // sets session.lockInfo from header

    if (!session.lockInfo) {
        return { acquired: false, reason: "server returned no lock information", resolved };
    }

    const interp = interpretLock(session.lockInfo, session.username);

    if (!interp.ours && !force) {
        // Held by someone else — do NOT force. Drop the foreign lockInfo so release() can't touch it.
        const heldBy = interp.holder;
        const since = interp.since;
        session.lockInfo = undefined;
        return { acquired: false, heldByOther: true, holder: heldBy, since, sinceText: sinceText(since), resolved };
    }

    // Ours (fresh, or own-stale reclaim, or forced). Prime platform version like the extension.
    try { await CloudPistonAPIManager.getPlatformInfo(session, resolved.id); } catch (e) { /* best-effort */ }
    return { acquired: true, reclaimed: force, holder: interp.holder, since: interp.since, sinceText: sinceText(interp.since), resolved };
}

// Release the lock we hold. Idempotent; never unlocks a lock we don't hold.
async function releaseByGuid(session, guid) {
    if (!session.lockInfo) return { released: false, reason: "no lock held" };
    const resolved = await resolveServerPalByGuid(session, guid);
    if (!resolved) throw new Error("GUID " + guid + " not found on " + session.environment.url);
    const resp = await CloudPistonAPIManager.unlockPal(session, resolved.id);
    session.lockInfo = undefined; // we no longer hold it
    // Unlock returns 200 with (possibly) a body; treat no-throw as released, report success when present.
    return { released: true, serverSuccess: resp ? !!resp.success : undefined };
}

// Read current lock holder by attempting a lock (the only way the API exposes it). For the
// same user this re-grants (harmless during our session); for another user it reports them.
async function statusByGuid(session, guid) {
    const result = await acquireByGuid(session, guid, { force: false });
    if (result.acquired) {
        return { locked: true, byUs: true, holder: result.holder, since: result.since, sinceText: result.sinceText };
    }
    if (result.heldByOther) {
        return { locked: true, byUs: false, holder: result.holder, since: result.since, sinceText: result.sinceText };
    }
    return { locked: false };
}

module.exports = { acquireByGuid, releaseByGuid, statusByGuid, interpretLock, sinceText };
