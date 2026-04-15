"use strict";

const assert = require("assert");
const { isDeepStrictEqual } = require("util");
const helper = require("./helper");

const cachingLinkGet = require("../src/caching-link-get");
const cachingLinkOut = require("../src/caching-link-out");

function waitForAsyncWork(delay = 25) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

function hasStatusCall(node, expectedStatus) {
    return node.status.args.some((call) => isDeepStrictEqual(call[0], expectedStatus));
}

describe("caching-link-get", function () {
    beforeEach(function (done) {
        helper.resetRuntimeState();
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.resetRuntimeState();
        helper.unload()
            .then(() => helper.stopServer(done))
            .catch(done);
    });

    it("merges cached message over inbound message and preserves inbound _msgid", function (done) {
        const flow = [
            { id: "out1", type: "caching-link-out", topic: "alpha", wires: [] },
            { id: "get1", type: "caching-link-get", topic: "alpha", wires: [["helper1"]] },
            { id: "helper1", type: "helper" }
        ];

        helper.load([cachingLinkOut, cachingLinkGet], flow, async function (err) {
            if (err) {
                done(err);
                return;
            }

            const outNode = helper.getNode("out1");
            const getNode = helper.getNode("get1");
            const helperNode = helper.getNode("helper1");
            const cachedMessage = {
                payload: { retained: true },
                topic: "from-cache",
                retainedFlag: true,
                override: "cache"
            };
            const inboundMessage = {
                _msgid: "inbound-id-1",
                payload: { inbound: true },
                topic: "from-inbound",
                trigger: true,
                override: "inbound"
            };

            helperNode.on("input", (msg) => {
                try {
                    assert.strictEqual(msg._msgid, "inbound-id-1");
                    assert.strictEqual(msg.trigger, true);
                    assert.strictEqual(msg.retainedFlag, true);
                    assert.strictEqual(msg.override, "cache");
                    assert.deepStrictEqual(msg.payload, { retained: true });
                    assert.strictEqual(msg.topic, "from-cache");
                    assert.notStrictEqual(msg, inboundMessage);
                    assert.notStrictEqual(msg, cachedMessage);
                    done();
                } catch (assertErr) {
                    done(assertErr);
                }
            });

            try {
                await waitForAsyncWork();
                outNode.receive(cachedMessage);
                await waitForAsyncWork();
                getNode.receive(inboundMessage);
            } catch (testErr) {
                done(testErr);
            }
        });
    });

    it("sends nothing when no cached message exists", function (done) {
        const flow = [
            { id: "get1", type: "caching-link-get", topic: "missing", wires: [["helper1"]] },
            { id: "helper1", type: "helper" }
        ];

        helper.load(cachingLinkGet, flow, async function (err) {
            if (err) {
                done(err);
                return;
            }

            const getNode = helper.getNode("get1");
            const helperNode = helper.getNode("helper1");

            let received = false;

            helperNode.on("input", () => {
                received = true;
            });

            try {
                await waitForAsyncWork();
                getNode.receive({ payload: "trigger" });
                await waitForAsyncWork(50);

                assert.strictEqual(received, false);
                assert.deepStrictEqual(hasStatusCall(getNode, {
                    fill: "grey",
                    shape: "ring",
                    text: "no cache"
                }), true);
                done();
            } catch (testErr) {
                done(testErr);
            }
        });
    });

    it("reports an invalid topic and sends nothing when topic is empty", function (done) {
        const flow = [
            { id: "get1", type: "caching-link-get", topic: "", wires: [["helper1"]] },
            { id: "helper1", type: "helper" }
        ];

        helper.load(cachingLinkGet, flow, async function (err) {
            if (err) {
                done(err);
                return;
            }

            const getNode = helper.getNode("get1");
            const helperNode = helper.getNode("helper1");

            let received = false;

            helperNode.on("input", () => {
                received = true;
            });

            try {
                await waitForAsyncWork();
                getNode.receive({ _msgid: "abc", payload: "trigger" });
                await waitForAsyncWork(50);

                assert.strictEqual(received, false);
                assert.strictEqual(getNode.error.callCount > 0, true);
                assert.deepStrictEqual(hasStatusCall(getNode, {
                    fill: "red",
                    shape: "ring",
                    text: "invalid topic"
                }), true);
                done();
            } catch (testErr) {
                done(testErr);
            }
        });
    });
});

