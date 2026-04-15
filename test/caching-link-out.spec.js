"use strict";

const assert = require("assert");
const helper = require("./helper");

const cachingLinkIn = require("../src/caching-link-in");
const cachingLinkOut = require("../src/caching-link-out");
const { clearMessageCache, getCachedMessage } = require("../src/message-cache");


function waitForAsyncWork(delay = 25) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

describe("caching-link-out", function () {
    beforeEach(function (done) {
        clearMessageCache();
        helper.startServer(done);
    });

    afterEach(function (done) {
        clearMessageCache();
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

    it("forwards messages only to caching-link-in nodes with the same topic", function (done) {
        const flow = [
            { id: "in1", type: "caching-link-in", topic: "alpha", wires: [["helper1"]] },
            { id: "in2", type: "caching-link-in", topic: "beta", wires: [["helper2"]] },
            { id: "out1", type: "caching-link-out", topic: "alpha", wires: [] },
            { id: "helper1", type: "helper" },
            { id: "helper2", type: "helper" }
        ];

        helper.load([cachingLinkOut, cachingLinkIn], flow, async function (err) {
            if (err) {
                done(err);
                return;
            }

            const helper1 = helper.getNode("helper1");
            const helper2 = helper.getNode("helper2");
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
                unexpectedForward = true;
            });

            try {
                await waitForAsyncWork();
                outNode.receive(message);
                await waitForAsyncWork(50);

                assert.strictEqual(matchedCount, 1);
                assert.strictEqual(unexpectedForward, false);
                done();
            } catch (testErr) {
                done(testErr);
            }
        });
    });
});

