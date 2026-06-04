"use strict";
// Keychain-backed CLI login. Flow: pick cloud -> resolve account -> get password (cached or
// masked prompt) -> validate via Ping.do -> store in OS keychain on success. Second run finds
// valid cached creds and skips the prompt entirely. No env vars, no plaintext on disk.
//
// Prompts are injectable (defaults use @clack/prompts) so the flow is testable headlessly.
const { loadClack } = require("../platform/uiPrompts");
const { authenticate } = require("../core/session");
const keychain = require("../platform/keychain");

// Known clouds; users can also enter a custom URL. Remembered selection handled by the launcher.
const CLOUDS = [
    { name: "Cloudpiston", url: "https://secure.cloudpiston.com" },
    { name: "Nimblewire", url: "https://secure.nimblewire.net" }
];

function cancelGuard(clack, value) {
    if (clack.isCancel(value)) { clack.cancel("Login cancelled."); process.exit(130); }
    return value;
}

// Default interactive prompts (TTY). Each returns the user's input.
const defaultPrompts = {
    async pickCloud(clouds) {
        const clack = await loadClack();
        const choice = cancelGuard(clack, await clack.select({
            message: "Select cloud",
            options: [...clouds.map(c => ({ value: c.url, label: c.name + "  (" + c.url + ")" })),
                      { value: "__custom__", label: "Custom URL…" }]
        }));
        if (choice === "__custom__") {
            return cancelGuard(clack, await clack.text({ message: "Cloud base URL", placeholder: "https://…" }));
        }
        return choice;
    },
    async pickAccount(usernames) {
        const clack = await loadClack();
        const choice = cancelGuard(clack, await clack.select({
            message: "Account",
            options: [...usernames.map(u => ({ value: u, label: u + "  (cached)" })),
                      { value: "__new__", label: "Use a different account…" }]
        }));
        return choice === "__new__" ? null : choice;
    },
    async askUsername() {
        const clack = await loadClack();
        return cancelGuard(clack, await clack.text({ message: "Username" }));
    },
    async askPassword(username, cloudUrl) {
        const clack = await loadClack();
        return cancelGuard(clack, await clack.password({ message: "Password for " + username + " @ " + cloudUrl }));
    }
};

// Returns { session, cloudUrl, username, prompted }. `prompted` is false when valid cached
// creds let us skip straight past the prompt.
async function login({ cloudUrl, username, prompts = defaultPrompts, forcePrompt = false } = {}) {
    let prompted = false;

    if (!cloudUrl) { cloudUrl = await prompts.pickCloud(CLOUDS); prompted = true; }

    if (!username) {
        const cachedUsers = keychain.listUsernames(cloudUrl);
        if (cachedUsers.length) {
            username = await prompts.pickAccount(cachedUsers);
        }
        if (!username) { username = await prompts.askUsername(); prompted = true; }
    }

    // Prefer cached password; only prompt if absent or explicitly forced.
    let password = forcePrompt ? null : keychain.getPassword(cloudUrl, username);

    for (let attempt = 0; ; attempt++) {
        if (!password) {
            password = await prompts.askPassword(username, cloudUrl);
            prompted = true;
        }
        try {
            const session = await authenticate(cloudUrl, username, password);
            keychain.setCredential(cloudUrl, username, password); // persist validated creds
            return { session, cloudUrl, username, prompted };
        } catch (err) {
            // Invalid creds: drop any cached value and re-prompt the password.
            keychain.deleteCredential(cloudUrl, username);
            password = null;
            if (typeof prompts.onAuthFailure === "function") {
                prompts.onAuthFailure(username, cloudUrl, attempt);
            }
            if (attempt >= 4) throw new Error("Authentication failed after multiple attempts for " + username + " @ " + cloudUrl);
        }
    }
}

module.exports = { login, CLOUDS, defaultPrompts };
