"use strict";
// Resolve a CloudPiston password for headless-capable contexts (the MCP server + the CLI
// subcommands), with ENV-FIRST precedence so palsync runs where there is NO OS keychain —
// an autonomous-agent box (Hermes on headless Linux), CI, a container.
//
// WHY ENV FIRST: on a headless Linux host with no Secret Service running, the keychain backend
// does not return null — it THROWS ("OS keychain unavailable"). So we must check env vars
// BEFORE touching the keychain; a box that sets CP_PASS never reaches the throwing backend.
//
// Precedence (first hit wins):
//   1. PALSYNC_PASSWORD_<SLUG>  — account-scoped, where SLUG = sanitized "<host>_<username>".
//      Lets one box serve multiple accounts/clouds unambiguously.
//   2. CP_PASS                  — the single-account convention the palpush deploy CLI already
//      uses. The common headless case (one box, one team account).
//   3. OS keychain              — the interactive-laptop path (set by the `palsync` launcher).
//
// The interactive launcher (auth/credentials.js) is unchanged and still keychain-only — env
// vars are a fallback for NON-interactive contexts, not a replacement for the login flow.
const keychain = require("../platform/keychain");

// Stable, collision-resistant env-var suffix for a (cloudUrl, username) pair.
//   "https://secure.cloudpiston.com" + "sam@x.com"
//     -> "SECURE_CLOUDPISTON_COM_SAM_X_COM"
function scopeSlug(cloudUrl, username) {
    let host = String(cloudUrl || "");
    try { host = new URL(cloudUrl).host; } catch (e) { /* not a URL — use as-is */ }
    return (host + "_" + String(username || ""))
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function scopedEnvName(cloudUrl, username) {
    return "PALSYNC_PASSWORD_" + scopeSlug(cloudUrl, username);
}

// Returns { password, source } or { password: null, source: null }. `env` is injectable for tests.
// Never throws on a missing keychain backend — a keychain error is treated as "no keychain
// credential available" so the env path (and the clear error below) still work headless.
function resolvePassword(cloudUrl, username, { env = process.env } = {}) {
    const scoped = env[scopedEnvName(cloudUrl, username)];
    if (scoped) return { password: scoped, source: "env:" + scopedEnvName(cloudUrl, username) };

    if (env.CP_PASS) return { password: env.CP_PASS, source: "env:CP_PASS" };

    try {
        const pw = keychain.getPassword(cloudUrl, username);
        if (pw) return { password: pw, source: "keychain" };
    } catch (e) { /* no keychain backend (headless) — fall through to "not found" */ }

    return { password: null, source: null };
}

// A single, actionable error that lists BOTH fixes — written for a literal-minded reader (and a
// headless operator who has no GUI keychain). Used wherever a password can't be resolved.
function credentialError(cloudUrl, username) {
    return new Error(
        "No CloudPiston password found for " + username + " @ " + cloudUrl + ".\n" +
        "Fix it ONE of these ways:\n" +
        "  1. Headless / autonomous (no OS keychain): set an environment variable —\n" +
        "       export CP_PASS='<the password for " + username + ">'\n" +
        "     (or, to scope it to this exact account: export " + scopedEnvName(cloudUrl, username) + "='<password>')\n" +
        "  2. Interactive desktop: run `palsync` once and log in — it stores the password in your OS keychain.\n" +
        "The username comes from .palsync.json; only the password is needed here."
    );
}

module.exports = { resolvePassword, credentialError, scopedEnvName, scopeSlug };
