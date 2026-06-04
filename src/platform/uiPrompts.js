"use strict";
// @clack/prompts is ESM-only (package "type": "module", ships only index.mjs). Node < 22.12
// (e.g. teammates on Node 18/20) cannot require() an ES module -> ERR_REQUIRE_ESM. Loading it
// via dynamic import() works on every Node >= 18, so the rest of the codebase stays CommonJS.
// Usage from a CJS module:  const clack = await loadClack();
let _clackPromise;

function loadClack() {
    if (!_clackPromise) _clackPromise = import("@clack/prompts");
    return _clackPromise;
}

module.exports = { loadClack };
