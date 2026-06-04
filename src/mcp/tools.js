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
const { hashWorkspace } = require("../core/workspaceHash");

function nowIso() { return new Date().toISOString(); }

const TOOLS = [
    {
        name: "pal_status",
        description: "Report whether the server is newer than your last pull, and the current lock holder.",
        inputShape: {},
        async run(ctx) {
            const live = await resolveServerPalByGuid(ctx.session, ctx.record.palGuid);
            const serverNewer = live ? drift.serverAdvanced(ctx.record.lastModifiedDate, live.lastModifiedDate) : false;
            let lockMsg;
            if (ctx.session.lockInfo) {
                const i = lock.interpretLock(ctx.session.lockInfo, ctx.session.username);
                lockMsg = i.ours ? ("held by you since " + lock.sinceText(i.since)) : ("held by " + i.holder);
            } else {
                lockMsg = "not held in this session";
            }
            const message =
                "Pal: " + ctx.record.palName + " (" + ctx.record.palGuid + ")\n" +
                (serverNewer ? "Server IS NEWER than your last pull — run pal_pull before pushing.\n" : "In sync with your last pull.\n") +
                "  your marker  : " + ctx.record.lastModifiedDate + "\n" +
                "  server marker: " + (live ? live.lastModifiedDate : "(unknown)") + "\n" +
                "Lock: " + lockMsg;
            return { message, serverNewer, storedMarker: ctx.record.lastModifiedDate, liveMarker: live && live.lastModifiedDate, lock: lockMsg };
        }
    },
    {
        name: "pal_pull",
        description: "Pull the pal from the server to disk. Refuses if it would overwrite un-pushed local changes (use force to override).",
        inputShape: { force: z.boolean().optional() },
        async run(ctx, { force = false } = {}) {
            const current = hashWorkspace(ctx.workspaceDir);
            if (ctx.record.localHash && current !== ctx.record.localHash && !force) {
                return { pulled: false, refused: "local-changes",
                    message: "REFUSED: the workspace has un-pushed local changes that pull would overwrite. pal_push first, or pal_pull with force:true to discard them." };
            }
            const { resolved, written } = await pull(ctx.session, ctx.record.palGuid, ctx.workspaceDir);
            ctx.record.lastModifiedDate = resolved.lastModifiedDate;
            ctx.record.localHash = hashWorkspace(ctx.workspaceDir);
            ctx.record.pulledAt = nowIso();
            await ctx.persist();
            return { pulled: true, files: written.base64.length, dataFiles: written.json.length, marker: resolved.lastModifiedDate,
                message: "Pulled " + ctx.record.palName + ": " + written.base64.length + " code files + " + written.json.length + " data/schema files. marker=" + resolved.lastModifiedDate };
        }
    },
    {
        name: "pal_push",
        description: "Push local changes to the server (UPDATE). Refuses if the server advanced since your last pull (drift) unless force:true.",
        inputShape: { force: z.boolean().optional() },
        async run(ctx, { force = false } = {}) {
            const res = await push(ctx.session, ctx.record, ctx.workspaceDir, { force: !!force });
            if (res.pushed) {
                ctx.record.localHash = hashWorkspace(ctx.workspaceDir);
                await ctx.persist();
                return Object.assign(res, {
                    message: "Pushed " + res.filesPushed + " files" + (res.forced ? " (forced past drift)" : "") +
                        ". save " + (res.pushed ? "OK" : "FAILED") + ". marker=" + res.newMarker + ". " +
                        res.validation.length + " validation note(s)." +
                        (res.skipped && res.skipped.length
                            ? "\n⚠ Skipped — these can't be created via palsync; make them in the PalBuilder GUI:\n" +
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
            if (res.refused === "locked-by-other") {
                return Object.assign(res, { message: "REFUSED: pal is locked by " + res.holder + " since " + res.since + ". Not overriding." });
            }
            return Object.assign(res, { message: "Push failed: " + (res.reason || res.refused || "unknown") });
        }
    },
    {
        name: "pal_lock",
        description: "Acquire the pal lock (auto-reclaims your own stale lock; never breaks another user's).",
        inputShape: {},
        async run(ctx) {
            const lk = await lock.acquireByGuid(ctx.session, ctx.record.palGuid, { force: false });
            if (lk.acquired) return { locked: true, byUs: true, since: lk.sinceText, message: "Lock held by you since " + lk.sinceText + (lk.reclaimed ? " (reclaimed)" : "") };
            if (lk.heldByOther) return { locked: true, byUs: false, holder: lk.holder, since: lk.sinceText, message: "Cannot lock: held by " + lk.holder + " since " + lk.sinceText + ". Not overriding." };
            return { locked: false, message: "Lock not granted: " + (lk.reason || "unknown") };
        }
    },
    {
        name: "pal_unlock",
        description: "Release the pal lock (reclaims and releases your own stale lock; refuses to break another user's).",
        inputShape: {},
        async run(ctx) {
            if (!ctx.session.lockInfo) {
                // Not held in this session — try to reclaim our own stale lock, then release it.
                const lk = await lock.acquireByGuid(ctx.session, ctx.record.palGuid, { force: false });
                if (lk.heldByOther) return { unlocked: false, refused: "locked-by-other", holder: lk.holder, message: "Refused: lock held by " + lk.holder + ". Not breaking it." };
                if (!lk.acquired) return { unlocked: false, message: "No lock to release." };
            }
            const rel = await lock.releaseByGuid(ctx.session, ctx.record.palGuid);
            return { unlocked: rel.released, message: rel.released ? "Lock released." : "No lock held." };
        }
    }
];

module.exports = { TOOLS };
