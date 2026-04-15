"use strict";

const assert = require("assert");
const { isDeepStrictEqual } = require("util");
const helper = require("./helper");

const cachingLinkIn = require("../src/caching-link-in");
const cachingLinkOut = require("../src/caching-link-out");
const { getCachedMessage } = require("../src/message-cache");


function waitForAsyncWork(delay = 25) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

function hasStatusCall(node, expectedStatus) {
    return node.status.args.some((call) => isDeepStrictEqual(call[0], expectedStatus));
}

describe("caching-link-out", function () {
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

    it("stores the last message in cache for its topic", function (done) {
        const flow = [
            { id: "out1", type: "caching-link-out", name: "out", topic: "alpha", wires: [] }
        ];

        helper.load(cachingLinkOut, flow, async function (err) {
            if (err) {
                done(err);
                return;
            }

            try {
                const outNode = helper.getNode("out1");
                const message = { payload: "hello", nested: { value: 42 } };

                await waitForAsyncWork();
                outNode.receive(message);
                await waitForAsyncWork();

                assert.deepStrictEqual(getCachedMessage("alpha"), message);
                assert.notStrictEqual(getCachedMessage("alpha"), message);
                done();
            } catch (testErr) {
                done(testErr);
            }
        });
    });

    it("forwards messages to all caching-link-in nodes with the same topic", function (done) {
        const flow = [
            { id: "in1", type: "caching-link-in", topic: "alpha", wires: [["helper1"]] },
            { id: "in2", type: "caching-link-in", topic: "alpha", wires: [["helper2"]] },
            { id: "in3", type: "caching-link-in", topic: "beta", wires: [["helper3"]] },
            { id: "out1", type: "caching-link-out", topic: "alpha", wires: [] },
            { id: "helper1", type: "helper" },
            { id: "helper2", type: "helper" },
            { id: "helper3", type: "helper" }
        ];

        helper.load([cachingLinkOut, cachingLinkIn], flow, async function (err) {
            if (err) {
                done(err);
                return;
            }

            const helper1 = helper.getNode("helper1");
            const helper2 = helper.getNode("helper2");
            const helper3 = helper.getNode("helper3");
            const outNode = helper.getNode("out1");
            const message = { payload: "forward me" };

            let matchedCount = 0;
            let unexpectedForward = false;

            helper1.on("input", (msg) => {
                matchedCount += 1;
                try {
                    assert.deepStrictEqual(msg, message);
                } catch (assertErr) {
                    done(assertErr);
                }
            });

            helper2.on("input", () => {
                matchedCount += 1;
            });

            helper3.on("input", () => {
                unexpectedForward = true;
            });

            try {
                await waitForAsyncWork();
                outNode.receive(message);
                await waitForAsyncWork(50);

                assert.strictEqual(matchedCount, 2);
                assert.strictEqual(unexpectedForward, false);
                done();
            } catch (testErr) {
                done(testErr);
            }
        });
    });

    it("shows no receivers status when nobody is listening", function (done) {
        const flow = [
            { id: "out1", type: "caching-link-out", topic: "alpha", wires: [] }
        ];

        helper.load(cachingLinkOut, flow, async function (err) {
            if (err) {
                done(err);
                return;
            }

            try {
                const outNode = helper.getNode("out1");

                await waitForAsyncWork();
                assert.deepStrictEqual(outNode.status.callCount > 0, true);
                assert.deepStrictEqual(hasStatusCall(outNode, {
                    fill: "yellow",
                    shape: "ring",
                    text: "no receivers"
                }), true);
                done();
            } catch (testErr) {
                done(testErr);
            }
        });
    });

    it("updates receiver count as caching-link-in nodes register and unregister", function (done) {
        const flow = [
            { id: "out1", type: "caching-link-out", topic: "alpha", wires: [] },
            { id: "in1", type: "caching-link-in", topic: "alpha", wires: [] }
        ];

        helper.load([cachingLinkOut, cachingLinkIn], flow, async function (err) {
            if (err) {
                done(err);
                return;
            }

            try {
                const outNode = helper.getNode("out1");

                await waitForAsyncWork();
                assert.deepStrictEqual(hasStatusCall(outNode, {
                    fill: "green",
                    shape: "dot",
                    text: "1 receiver"
                }), true);

                await helper.unload();
                helper.resetRuntimeState();
                await new Promise((resolve, reject) => {
                    helper.load(cachingLinkOut, [{ id: "out2", type: "caching-link-out", topic: "alpha", wires: [] }], (loadErr) => {
                        if (loadErr) {
                            reject(loadErr);
                        } else {
                            resolve();
                        }
                    });
                });

                const outNode2 = helper.getNode("out2");
                await waitForAsyncWork();
                assert.deepStrictEqual(hasStatusCall(outNode2, {
                    fill: "yellow",
                    shape: "ring",
                    text: "no receivers"
                }), true);
                done();
            } catch (testErr) {
                done(testErr);
            }
        });
    });

    it("raises an error when input arrives with an empty topic", function (done) {
        const flow = [
            { id: "out1", type: "caching-link-out", topic: "", wires: [] }
        ];

        helper.load(cachingLinkOut, flow, async function (err) {
            if (err) {
                done(err);
                return;
            }

            try {
                const outNode = helper.getNode("out1");

                await waitForAsyncWork();
                outNode.receive({ payload: "should fail" });
                await waitForAsyncWork();

                assert.strictEqual(outNode.error.callCount > 0, true);
                assert.deepStrictEqual(hasStatusCall(outNode, {
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

