"use strict";

const { normalizeTopic, registerInNode, unregisterInNode } = require("./message-cache");

module.exports = function (RED) {
    function CachingLinkInNode(config) {
        RED.nodes.createNode(this, config);

        const node = this;

        node.name = config.name;
        node.topic = normalizeTopic(config.topic);

        registerInNode(node.topic, node);
        node.status({ fill: "blue", shape: "dot", text: node.topic || "no topic" });

        node.on("input", (msg, send, done) => {
            send(msg);

            if (done) {
                done();
            }
        });

        node.on("close", () => {
            unregisterInNode(node.topic, node);
        });
    }

    RED.nodes.registerType("caching-link-in", CachingLinkInNode);
};

