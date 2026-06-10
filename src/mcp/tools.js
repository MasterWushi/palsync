"use strict";
// The five palsync MCP tools. Each `run(ctx, args)` is a plain async function (so it's directly
// testable); server.js wraps them for the MCP SDK. ctx = { session, record, workspaceDir,
// lifecycle, persist() }. Datasets/dataviews are never created or destroyed by any tool.
const { z } = require("zod");
const { pull } = require("../core/pull");
const { push } = require("../core/push");
const lock = require("../core/lock");
const drift = require("../core/drift");
const { resolveServerPalByGuid } = require("../core/resolve");
const { hashWorkspace, hashPaths } = require("../core/workspaceHash");
const { diffWorkspace, describeDiff } = require("../core/localDrift");

// Refresh the record's local baseline after a pull/push: localHash (legacy combined hash) +
// fileHashes (per-file map over exactly the server-tracked paths — preserved local-only files
// must NOT enter it, or the next pull would mistake them for server-side deletes).
function refreshBaseline(record, workspaceDir, serverPaths) {
    record.localHash = hashWorkspace(workspaceDir);
    if (serverPaths) record.fileHashes = hashPaths(workspaceDir, serverPaths);
}

function nowIso() { return new Date().toISOString(); }

// Print the FULL text of every server validation note (group/object: message), not just a count —
// a count hides content-affecting warnings (e.g. a page with no body tag that won't save).
function formatValidation(notes) {
    if (!notes || !notes.length) return "No validation notes.";
    return "Server validation notes (" + notes.length + "):\n" +
        notes.map(v => "   - " + (v.group || "?") + "/" + (v.object || "(general)") + ": " + v.message).join("\n");
}

// High-friction override: the user must type this EXACT phrase, echoing the pal name, so it can't
// be passed casually. (Lock-Force itself is still disabled pending verification — see core/lock.)
function overridePhrase(palName) { return "OVERRIDE " + palName; }

// Build an honest, owner-aware message for a blocked lock. Never implies "probably you" unless
// teamInfo actually shows the owner is us.
function blockedMessage(blocked, info, palName) {
    if (blocked === "gui-lock-self") {
        return "This pal is locked — you have \"" + palName + "\" checked out in PalBuilder (since " + info.since + ").\n" +
            "Unlock and close it in PalBuilder, then re-run palsync.";
    }
    if (blocked === "gui-lock-other") {
        return "This pal is locked by " + info.holder + " (since " + info.since + ").\n" +
            "They must unlock and close it in PalBuilder. Overriding may DESTROY their unsaved work.";
    }
    if (blocked === "override-disabled") {
        return "Override is not enabled in this build — palsync has not verified that force-override " +
            "safely breaks a PalBuilder lock, and breaking one can destroy unsaved work.\n" +
            "Unlock and close it in PalBuilder instead. (Held by " + info.holder + " since " + info.since + ".)";
    }
    // unknown-holder
    return "This pal is locked and palsync can't determine the holder (the server did not report it).\n" +
        "Unlock and close it in PalBuilder, then re-run palsync. Overriding may destroy another user's unsaved work.";
}

// Append the typed-OVERRIDE instructions when the user hasn't confirmed yet.
function withOverrideGate(message, confirmOverride, palName) {
    if (confirmOverride === overridePhrase(palName)) return message;
    return message + "\n\nThis will NOT proceed without an explicit typed confirmation. To override, " +
        "call again with EXACTLY:\n  confirmOverride: \"" + overridePhrase(palName) + "\"";
}

const TOOLS = [
    {
        name: "pal_status",
        description: "Report whether the server is newer than your last pull, and who holds the lock (read-only).",
        inputShape: {},
        async run(ctx) {
            const live = await resolveServerPalByGuid(ctx.session, ctx.record.palGuid);
            const serverNewer = live ? drift.serverAdvanced(ctx.record.lastModifiedDate, live.lastModifiedDate) : false;
            const st = await lock.statusByGuid(ctx.session, ctx.record.palGuid); // read-only — no lock attempt
            let lockMsg;
            if (!st.locked) lockMsg = "not locked";
            else if (st.kind === "gui") lockMsg = (st.byUs ? "checked out by you in PalBuilder" : "locked by " + st.holder) + " since " + st.since;
            else lockMsg = "held by this palsync session";
            // Both directions: server-vs-last-pull (above) AND disk-vs-last-pull (below).
            const d = diffWorkspace(ctx.record, ctx.workspaceDir);
            const localMsg = (d.dirty || d.added.length)
                ? "Local: UN-PUSHED changes on disk —\n" + describeDiff(d)
                : "Local: no un-pushed changes.";
            const message =
                "Pal: " + ctx.record.palName + " (" + ctx.record.palGuid + ")\n" +
                (serverNewer ? "Server IS NEWER than your last pull — run pal_pull before pushing.\n" : "In sync with your last pull.\n") +
                "  your marker  : " + ctx.record.lastModifiedDate + "\n" +
                "  server marker: " + (live ? live.lastModifiedDate : "(unknown)") + "\n" +
                localMsg + "\n" +
                "Lock: " + lockMsg;
            return { message, serverNewer, storedMarker: ctx.record.lastModifiedDate, liveMarker: live && live.lastModifiedDate,
                     localChanges: { dirty: d.dirty, changed: d.changed, added: d.added, deleted: d.deleted }, lock: st };
        }
    },
    {
        name: "pal_pull",
        description: "Pull (sync) the pal from the server. New un-pushed local files are preserved. Refuses if it would overwrite locally-modified server files (use force to override).",
        inputShape: { force: z.boolean().optional() },
        async run(ctx, { force = false } = {}) {
            // Reverse drift guard, per-file: changed/deleted server-tracked files (and pure
            // pal.json mutations) block the pull; NEW local files don't — sync preserves them.
            const d = diffWorkspace(ctx.record, ctx.workspaceDir);
            if (d.dirty && !force) {
                return { pulled: false, refused: "local-changes", changed: d.changed, deleted: d.deleted, added: d.added,
                    message: "REFUSED: un-pushed local changes would be lost by this pull.\n" + describeDiff(d) +
                        "\npal_push first, or pal_pull with force:true to overwrite them." +
                        (d.legacy ? "" : " (New local files are preserved either way.)") };
            }
            const { resolved, written, removed, preserved, serverPaths } = await pull(ctx.session, ctx.record.palGuid, ctx.workspaceDir, { baseline: ctx.record.fileHashes || null });
            ctx.record.lastModifiedDate = resolved.lastModifiedDate;
            refreshBaseline(ctx.record, ctx.workspaceDir, serverPaths);
            ctx.record.pulledAt = nowIso();
            await ctx.persist();
            return { pulled: true, files: written.base64.length, dataFiles: written.json.length, marker: resolved.lastModifiedDate,
                message: "Pulled " + ctx.record.palName + ": " + written.base64.length + " code files + " + written.json.length + " data/schema files. marker=" + resolved.lastModifiedDate +
                    (removed.length ? "\nRemoved (deleted on server): " + removed.join(", ") : "") +
                    (preserved.length ? "\nPreserved local work:\n" + preserved.map(p => "   - " + p.rel + " — " + p.note).join("\n") : "") };
        }
    },
    {
        name: "pal_push",
        description: "Push local changes to the server (UPDATE). Refuses on drift (force:true) or if locked by another holder (typed confirmOverride).",
        inputShape: { force: z.boolean().optional(), confirmOverride: z.string().optional() },
        async run(ctx, { force = false, confirmOverride } = {}) {
            const palName = ctx.record.palName;
            const overrideLock = confirmOverride === overridePhrase(palName);
            const res = await push(ctx.session, ctx.record, ctx.workspaceDir, { force: !!force, overrideLock });
            if (res.pushed) {
                refreshBaseline(ctx.record, ctx.workspaceDir, res.serverPaths);
                await ctx.persist();
                return Object.assign(res, {
                    message: "Pushed " + res.filesPushed + " files" + (res.forced ? " (forced past drift)" : "") +
                        ". save " + (res.pushed ? "OK" : "FAILED") + ". marker=" + res.newMarker + ".\n" +
                        formatValidation(res.validation) +
                        (res.skipped && res.skipped.length
                            ? "\n⚠ Skipped — these can't be created via palsync; make them in PalBuilder:\n" +
                              res.skipped.map(s => "   - " + s.type + "/" + s.file + " (" + s.reason + ")").join("\n")
                            : "")
                });
            }
            if (res.refused === "drift") {
                return Object.assign(res, {
                    message: "REFUSED (drift): the server was saved after your last pull.\n" +
                        "  your marker  : " + res.storedMarker + "\n" +
                        "  server marker: " + res.liveMarker + "\n" +
                        "  last edited by: " + res.lastEditUser + " at " + res.lastEditDate + "\n" +
                        "Run pal_pull to reconcile, or pal_push with force:true to overwrite."
                });
            }
            // lock-blocked refusals (gui-lock-self / gui-lock-other / override-disabled / unknown-holder)
            if (["gui-lock-self", "gui-lock-other", "override-disabled", "unknown-holder"].includes(res.refused)) {
                return Object.assign(res, { message: withOverrideGate("REFUSED: " + blockedMessage(res.refused, res, palName), confirmOverride, palName) });
            }
            return Object.assign(res, { message: "Push failed: " + (res.reason || res.refused || "unknown") });
        }
    },
    {
        name: "pal_lock",
        description: "Acquire the pal lock. Reports the real holder (from teamInfo) when blocked; override is high-friction and typed.",
        inputShape: { confirmOverride: z.string().optional() },
        async run(ctx, { confirmOverride } = {}) {
            const palName = ctx.record.palName;
            // Route through the lifecycle (not core/lock directly) so an explicit pal_lock clears
            // a prior pal_unlock's userReleased flag and restarts the idle timer.
            let lk = await ctx.lifecycle.acquire({ force: false });
            if (lk.acquired) return { locked: true, byUs: true, message: "Lock held by you" + (lk.reclaimed ? " (reclaimed)" : "") + "." };
            // blocked — if the user typed the exact override phrase, attempt force (currently dormant).
            if (confirmOverride === overridePhrase(palName)) {
                lk = await ctx.lifecycle.acquire({ force: true });
                if (lk.acquired) return { locked: true, byUs: true, forced: true, message: "Lock force-acquired." };
            }
            return { locked: false, blocked: lk.blocked, holder: lk.holder, since: lk.since,
                message: withOverrideGate(blockedMessage(lk.blocked, lk, palName), confirmOverride, palName) };
        }
    },
    {
        name: "pal_unlock",
        description: "Release palsync's lock. Cannot release a PalBuilder checkout — that must be released in PalBuilder.",
        inputShape: {},
        async run(ctx) {
            if (ctx.session.lockInfo) {
                // userRequested: an explicit unlock must stick — tool activity won't re-acquire
                // past it (only an explicit pal_lock re-arms the lifecycle).
                const rel = await ctx.lifecycle.release("user-request", { userRequested: true });
                return { unlocked: rel.released, message: rel.released ? "Lock released." : "No lock held." };
            }
            const st = await lock.statusByGuid(ctx.session, ctx.record.palGuid);
            if (st.locked && st.kind === "gui") {
                return { unlocked: false, message: (st.byUs ? "You hold \"" + ctx.record.palName + "\" as a PalBuilder checkout" : "Locked by " + st.holder) +
                    " — release it in PalBuilder; palsync can't unlock a PalBuilder lock." };
            }
            return { unlocked: false, message: "No palsync lock to release." };
        }
    }
];

module.exports = { TOOLS, overridePhrase, blockedMessage };
