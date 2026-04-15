"use strict";

const assert = require("assert");
const { isDeepStrictEqual } = require("util");
const helper = require("./helper");

const cachingLinkIn = require("../src/caching-link-in");

describe("caching-link-in", function () {
    function hasStatusCall(node, expectedStatus) {
        return node.status.args.some((call) => isDeepStrictEqual(call[0], expectedStatus));
    }

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

    it("passes received messages to its output", function (done) {
        const flow = [
            { id: "in1", type: "caching-link-in", topic: "alpha", wires: [["helper1"]] },
            { id: "helper1", type: "helper" }
        ];

        helper.load(cachingLinkIn, flow, function (err) {
            if (err) {
                done(err);
                return;
            }

            const inputNode = helper.getNode("in1");
            const helperNode = helper.getNode("helper1");
            const message = { payload: "from out" };

            helperNode.on("input", (msg) => {
                try {
                    assert.deepStrictEqual(msg, message);
                    done();
                } catch (assertErr) {
                    done(assertErr);
                }
            });

            inputNode.receive(message);
        });
    });

    it("shows a missing-topic status when topic is empty", function (done) {
        const flow = [
            { id: "in1", type: "caching-link-in", topic: "", wires: [] }
        ];

        helper.load(cachingLinkIn, flow, function (err) {
            if (err) {
                done(err);
                return;
            }

            try {
                const inputNode = helper.getNode("in1");

                assert.deepStrictEqual(hasStatusCall(inputNode, {
                    fill: "red",
                    shape: "ring",
                    text: "missing topic"
                }), true);
                done();
            } catch (testErr) {
                done(testErr);
            }
        });
    });
});

