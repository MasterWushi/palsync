"use strict";
// Cross-platform "open this URL in the user's default browser", with NO shell interpolation —
// the URL is passed as an argv element, never concatenated into a command string, so a URL that
// carries query params (incl. the credential-bearing cp-auth token) can't be shell-injected and
// never appears in a shell history. macOS `open`, Windows `start` (via cmd, URL quoted as a
// separate arg), Linux `xdg-open`. Best-effort: returns { opened, reason } and never throws —
// a failed open is a degraded preview, not a crashed tool.
const { spawn } = require("child_process");

function openUrl(url) {
    return new Promise((resolve) => {
        let cmd, args, opts = { stdio: "ignore" };
        if (process.platform === "darwin") {
            cmd = "open"; args = [url];
        } else if (process.platform === "win32") {
            // `start` is a cmd builtin; the empty "" is the window-title arg so a quoted URL
            // isn't mistaken for the title. cmd handles the URL as one arg (no shell:true, so
            // no PowerShell/zsh interpolation of & in the query string).
            cmd = "cmd"; args = ["/c", "start", "", url];
        } else {
            cmd = "xdg-open"; args = [url];
        }
        try {
            const child = spawn(cmd, args, opts);
            let settled = false;
            child.on("error", (err) => { if (!settled) { settled = true; resolve({ opened: false, reason: (err && err.code) || "spawn-error" }); } });
            // The opener returns immediately; treat a clean spawn as success and unref so it
            // never holds the event loop open.
            child.unref();
            setTimeout(() => { if (!settled) { settled = true; resolve({ opened: true }); } }, 150);
        } catch (err) {
            resolve({ opened: false, reason: (err && err.message) || "spawn-throw" });
        }
    });
}

module.exports = { openUrl };
