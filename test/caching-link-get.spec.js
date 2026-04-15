"use strict";

const assert = require("assert");
const helper = require("./helper");

const cachingLinkGet = require("../src/caching-link-get");
const cachingLinkOut = require("../src/caching-link-out");
const { clearMessageCache } = require("../src/message-cache");


function waitForAsyncWork(delay = 25) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

describe("caching-link-get", function () {
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

    it("returns the cached message for its topic", function (done) {
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
            const cachedMessage = { payload: { answer: 42 }, topic: "ignored-by-cache-node" };

            helperNode.on("input", (msg) => {
                try {
                    assert.deepStrictEqual(msg, cachedMessage);
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
                getNode.receive({ payload: "trigger" });
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
                done();
            } catch (testErr) {
                done(testErr);
            }
        });
    });
});

