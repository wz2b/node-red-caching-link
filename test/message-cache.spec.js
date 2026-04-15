"use strict";

const assert = require("assert");

const {
    clearMessageCache,
    getRegisteredInNodeCount,
    getRegisteredInNodes,
    registerInNode,
    registerOutNode,
    unregisterInNode,
    unregisterOutNode
} = require("../src/message-cache");

describe("message-cache registry", function () {
    beforeEach(function () {
        clearMessageCache();
    });

    afterEach(function () {
        clearMessageCache();
    });

    it("tracks caching-link-in registrations by exact topic", function () {
        const alphaIn = { id: "in-alpha", receive: () => {} };
        const betaIn = { id: "in-beta", receive: () => {} };

        registerInNode("alpha", alphaIn);
        registerInNode("beta", betaIn);

        assert.strictEqual(getRegisteredInNodeCount("alpha"), 1);
        assert.strictEqual(getRegisteredInNodeCount("beta"), 1);
        assert.strictEqual(getRegisteredInNodeCount("Alpha"), 0);
        assert.deepStrictEqual(getRegisteredInNodes("alpha"), [alphaIn]);

        unregisterInNode("alpha", alphaIn);
        assert.strictEqual(getRegisteredInNodeCount("alpha"), 0);
    });

    it("keeps out-node receiver count in sync when in-nodes register and unregister", function () {
        const updates = [];
        const outNode = {
            updateReceiverStatus: (count) => updates.push(count)
        };

        const in1 = { id: "in-1", receive: () => {} };
        const in2 = { id: "in-2", receive: () => {} };

        registerOutNode("sync", outNode);
        registerInNode("sync", in1);
        registerInNode("sync", in2);
        unregisterInNode("sync", in1);
        unregisterInNode("sync", in2);
        unregisterOutNode("sync", outNode);

        assert.deepStrictEqual(updates, [0, 1, 2, 1, 0]);
    });
});

