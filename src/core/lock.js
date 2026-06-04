"use strict";
// Lock model (verified against the live server — see investigation notes):
//   * Team/GUI lock ("check out", lockType "teamMember") is visible read-only in getPal().teamInfo
//     with the real owner profile (email/name). It BLOCKS LockPal.do (which then returns a null
//     owner, so LockPal alone can't identify the holder).
//   * Webstart lock (LockPal.do, what palsync uses) is NOT in teamInfo and is re-granted to the
//     same user. lockGranted === true is the authoritative "you got it" signal.
// So: read the owner from teamInfo (no lock needed); use lockGranted to know if we acquired.
const { CloudPistonAPIManager } = require("../../lib/apiManager");
const { resolveServerPalByGuid } = require("./resolve");

// Force-override (Lock-Force against a team/GUI lock) is NOT yet trusted: whether Lock-Force
// actually breaks a teamMember lock is unverified, and breaking a live GUI checkout could destroy
// another user's unsaved work. Stays false until verified on a throwaway GUI-locked pal.
const OVERRIDE_ENABLED = false;

function sameUser(email, username) {
    return !!(email && username && String(email).toLowerCase() === String(username).toLowerCase());
}

// Read the real lock owner WITHOUT acquiring anything. getPal is read-only; teamInfo is present
// only when a team/GUI lock is held. Returns { lockType, since, ownerEmail, ownerName } or null.
async function readTeamLock(session, palId) {
    const gp = await CloudPistonAPIManager.getPal(session, palId);
    const ti = gp && gp.teamInfo && gp.teamInfo["com.contractpal.pal.TeamInfo"];
    if (!ti) return null;
    const p = ti.profile || {};
    return {
        lockType: ti.lockType,
        since: ti.lockDate && (ti.lockDate._text || ti.lockDate) || null,
        ownerEmail: p.email || null,
        ownerName: [p.firstName, p.lastName].filter(Boolean).join(" ") || p.profileName || null
    };
}

function holderLabel(team) {
    return (team.ownerName ? team.ownerName : "(unknown)") + (team.ownerEmail ? " (" + team.ownerEmail + ")" : "");
}

// Acquire the Webstart lock for a pal by GUID. Detects a blocking team/GUI lock first (read-only)
// and reports the real owner. force only ever attempts Lock-Force when OVERRIDE_ENABLED is true.
async function acquireByGuid(session, guid, { force = false } = {}) {
    const resolved = await resolveServerPalByGuid(session, guid);
    if (!resolved) throw new Error("GUID " + guid + " not found on " + session.environment.url);

    // 1) Team/GUI lock? (read-only) — that blocks LockPal; we can name the real owner.
    const team = await readTeamLock(session, resolved.id);
    if (team) {
        const mine = sameUser(team.ownerEmail, session.username);
        if (!force) {
            return { acquired: false, blocked: mine ? "gui-lock-self" : "gui-lock-other",
                     holder: holderLabel(team), holderEmail: team.ownerEmail, since: team.since, resolved };
        }
        if (!OVERRIDE_ENABLED) {
            // Override requested (typed-OVERRIDE confirmed upstream) but the force path is not yet
            // verified/enabled. Refuse rather than silently no-op or risk destroying GUI work.
            return { acquired: false, blocked: "override-disabled",
                     holder: holderLabel(team), holderEmail: team.ownerEmail, since: team.since, resolved };
        }
        // force && OVERRIDE_ENABLED → fall through to Lock-Force (post-verification only)
    }

    // 2) Webstart lock. lockGranted (now parsed correctly) is the authoritative proceed signal.
    await CloudPistonAPIManager.lockPal(session, resolved.id, force);
    const granted = !!(session.lockInfo && session.lockInfo.lockGranted === true);
    if (granted) {
        try { await CloudPistonAPIManager.getPlatformInfo(session, resolved.id); } catch (e) { /* best-effort */ }
        return { acquired: true, reclaimed: force, resolved };
    }
    // Denied with no team lock + null owner → genuinely unknown holder.
    session.lockInfo = undefined;
    return { acquired: false, blocked: "unknown-holder", resolved };
}

// Release the lock we hold. Idempotent; never unlocks a lock we don't hold.
async function releaseByGuid(session, guid) {
    if (!session.lockInfo) return { released: false, reason: "no lock held" };
    const resolved = await resolveServerPalByGuid(session, guid);
    if (!resolved) throw new Error("GUID " + guid + " not found on " + session.environment.url);
    const resp = await CloudPistonAPIManager.unlockPal(session, resolved.id);
    session.lockInfo = undefined;
    return { released: true, serverSuccess: resp ? !!resp.success : undefined };
}

// Read-only status: who holds it, from teamInfo (no lock attempt). Falls back to our own
// in-session Webstart lock if we hold one.
async function statusByGuid(session, guid) {
    const resolved = await resolveServerPalByGuid(session, guid);
    if (!resolved) throw new Error("GUID " + guid + " not found on " + session.environment.url);
    const team = await readTeamLock(session, resolved.id);
    if (team) {
        return { locked: true, kind: "gui", byUs: sameUser(team.ownerEmail, session.username),
                 holder: holderLabel(team), holderEmail: team.ownerEmail, since: team.since };
    }
    if (session.lockInfo && session.lockInfo.lockGranted === true) {
        return { locked: true, kind: "palsync", byUs: true, holder: "you (this palsync session)" };
    }
    return { locked: false };
}

module.exports = { acquireByGuid, releaseByGuid, statusByGuid, readTeamLock, sameUser, OVERRIDE_ENABLED };
