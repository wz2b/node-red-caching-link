"use strict";

const assert = require("assert");
const helper = require("./helper");

const cachingLinkIn = require("../src/caching-link-in");
const { clearMessageCache } = require("../src/message-cache");


describe("caching-link-in", function () {
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
});

