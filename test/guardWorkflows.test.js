"use strict";
// Unit tests for the workflow push guard. New workflows ARE pushable (verified live); the guard
// only strips a NEW workflow missing a valid workflowType, so a malformed entry can't sink the
// whole transactional save. Pure, no network. Run: npm test.
const { test } = require("node:test");
const assert = require("node:assert");
const { guardWorkflows } = require("../src/core/push");

function palWith(entries) {
    return { workflows: { entry: entries } };
}
const wf = (string, workflowType) => ({ string, Workflow: workflowType === undefined ? {} : { workflowType } });

test("keeps a well-formed new workflow (valid workflowType)", () => {
    const pal = palWith([wf("main", 9)]);
    const skipped = guardWorkflows(pal, { workflows: new Set() });
    assert.equal(skipped.length, 0);
    assert.deepEqual(pal.workflows.entry.map(e => e.string), ["main"]);
});

test("strips a new workflow missing workflowType, and reports it", () => {
    const pal = palWith([wf("broken")]);
    const skipped = guardWorkflows(pal, { workflows: new Set() });
    assert.equal(pal.workflows.entry.length, 0);
    assert.equal(skipped.length, 1);
    assert.equal(skipped[0].type, "workflows");
    assert.match(skipped[0].reason, /workflowType/);
});

test("strips a new workflow with an invalid workflowType number", () => {
    const pal = palWith([wf("weird", 99)]);   // 99 not in the platform enum
    const skipped = guardWorkflows(pal, { workflows: new Set() });
    assert.equal(pal.workflows.entry.length, 0);
    assert.equal(skipped.length, 1);
});

test("keeps an existing workflow even with no workflowType (edit, not create)", () => {
    const pal = palWith([wf("existing")]);
    const skipped = guardWorkflows(pal, { workflows: new Set(["existing"]) });
    assert.equal(skipped.length, 0);
    assert.deepEqual(pal.workflows.entry.map(e => e.string), ["existing"]);
});

test("no baseline (serverKnown null) -> no stripping, let the server arbitrate", () => {
    const pal = palWith([wf("main")]);
    const skipped = guardWorkflows(pal, null);
    assert.equal(skipped.length, 0);
    assert.equal(pal.workflows.entry.length, 1);
});

test("mixed: keeps valid + existing, strips malformed new", () => {
    const pal = palWith([wf("ok", 7), wf("existing"), wf("bad")]);
    const skipped = guardWorkflows(pal, { workflows: new Set(["existing"]) });
    assert.deepEqual(pal.workflows.entry.map(e => e.string), ["ok", "existing"]);
    assert.deepEqual(skipped.map(s => s.file), ["bad"]);
});
