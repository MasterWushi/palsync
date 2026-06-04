"use strict";
// Ported verbatim from the extension's out/cloudPistonAuthProvider.js (PalLockInfo only).
// Everything else in that file is vscode auth-provider plumbing we don't need.
class PalLockInfo {
    constructor(lockUser, lockDate, lastEditUser, lastEditDate, lockGranted) {
        this.lockUser = lockUser;
        this.lockDate = lockDate;
        this.lastEditUser = lastEditUser;
        this.lastEditDate = lastEditDate;
        this.lockGranted = lockGranted;
    }
    toHeaderString() {
        return Buffer.from([this.lockUser, this.lockDate, this.lastEditUser, this.lastEditDate, this.lockGranted].toString()).toString("base64");
    }
}

module.exports = { PalLockInfo };
