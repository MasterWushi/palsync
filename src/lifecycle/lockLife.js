"use strict";
// Guaranteed lock lifecycle: acquire on start, release on clean exit AND idle timeout, via a
// path a crash can't strand. Cross-platform: 'exit'/'beforeExit' + SIGINT (+ SIGBREAK on
// Windows, SIGTERM/SIGHUP on POSIX). A hard kill (kill -9 / TerminateProcess) bypasses ALL
// handlers on every OS — that case is covered not here but by own-stale-lock auto-reclaim
// in core/lock (the server re-grants the same user their lock next session).
const lock = require("../core/lock");

const DEFAULT_IDLE_MS = 15 * 60 * 1000; // 15 min, configurable

class LockLifecycle {
    constructor(session, guid, { idleMs = DEFAULT_IDLE_MS, log = () => {}, exitOnIdle = true, onRelease = null } = {}) {
        this.session = session;
        this.guid = guid;
        this.idleMs = idleMs;
        this.log = log;
        this.exitOnIdle = exitOnIdle;
        this.onRelease = onRelease;
        this.idleTimer = null;
        this.released = false;
        this.lockState = null;
        this._signalsInstalled = false;
    }

    async acquire({ force = false } = {}) {
        this.lockState = await lock.acquireByGuid(this.session, this.guid, { force });
        if (this.lockState.acquired) this.touch();
        return this.lockState;
    }

    // Reset the idle timer on activity (every MCP tool call calls this).
    touch() {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        if (this.idleMs > 0) {
            this.idleTimer = setTimeout(() => this._onIdle(), this.idleMs);
            if (this.idleTimer.unref) this.idleTimer.unref(); // don't keep the event loop alive by itself
        }
    }

    async _onIdle() {
        // THE REAL FIX: this runs from a setTimeout callback that does NOT await us, so any
        // rejection here is an UNHANDLED rejection — and on Node >= 15 that terminates the
        // process. A failed idle-release (network blip, expired session, server 5xx) must be
        // caught and logged here, never allowed to escape. Release is best-effort; we still
        // exit so the idle session ends (own-stale-lock auto-reclaim covers a missed release).
        this.log("idle " + this.idleMs + "ms — releasing lock");
        try {
            await this.release("idle-timeout");
        } catch (err) {
            this.log("idle-release FAILED (continuing to exit; lock auto-reclaims next session): " +
                (err && err.stack ? err.stack : err));
        }
        if (this.exitOnIdle) process.exit(0);
    }

    // Idempotent release. Safe to call from multiple handlers (signals + finally).
    async release(reason) {
        if (this.released) return { released: false, reason: "already released" };
        this.released = true;
        if (this.idleTimer) clearTimeout(this.idleTimer);
        const result = await lock.releaseByGuid(this.session, this.guid);
        this.log("lock released (" + (reason || "explicit") + "): " + JSON.stringify(result));
        if (typeof this.onRelease === "function") this.onRelease(reason, result);
        return result;
    }

    // Register OS-appropriate exit handlers (used by the long-lived MCP server).
    installSignalHandlers() {
        if (this._signalsInstalled) return;
        this._signalsInstalled = true;
        const signals = process.platform === "win32"
            ? ["SIGINT", "SIGBREAK"]
            : ["SIGINT", "SIGTERM", "SIGHUP"];
        for (const sig of signals) {
            process.once(sig, async () => {
                try { await this.release(sig); } catch (e) { /* best-effort */ }
                process.exit(0);
            });
        }
        // Last-chance synchronous hook; async unlock can't be awaited here, so it's best-effort.
        process.once("beforeExit", async () => { try { await this.release("beforeExit"); } catch (e) {} });
    }
}

module.exports = { LockLifecycle, DEFAULT_IDLE_MS };
