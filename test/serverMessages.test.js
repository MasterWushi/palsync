"use strict";
// normalizeMessages extracts resp.messages (server-level failures like "Pal is not a Web Pal")
// — the field the CLI used to drop, printing "No validation notes" over the real cause.
const { test } = require("node:test");
const assert = require("node:assert");
const { normalizeMessages } = require("../src/core/test");

test("normalizeMessages: single message object", () => {
    const resp = { messages: { "com.contractpal.Message": { message: "Pal is not a Web Pal", type: "error" } } };
    assert.deepEqual(normalizeMessages(resp), [{ message: "Pal is not a Web Pal", type: "error" }]);
});

test("normalizeMessages: array of messages", () => {
    const resp = { messages: { "com.contractpal.Message": [{ message: "a", type: "error" }, { message: "b", type: "warn" }] } };
    assert.equal(normalizeMessages(resp).length, 2);
    assert.deepEqual(normalizeMessages(resp).map(m => m.message), ["a", "b"]);
});

test("normalizeMessages: empty / missing -> []", () => {
    assert.deepEqual(normalizeMessages({ messages: "" }), []);
    assert.deepEqual(normalizeMessages({}), []);
    assert.deepEqual(normalizeMessages(undefined), []);
});
