"use strict";

const {
    getCachedMessage,
    hasCachedMessage,
    normalizeTopic,
    registerGetNode,
    statusForTopic,
    unregisterGetNode
} = require("./message-cache");

module.exports = function (RED) {
    function CachingLinkGetNode(config) {
        RED.nodes.createNode(this, config);

        const node = this;
        const cloneMessage = RED.util && typeof RED.util.cloneMessage === "function"
            ? RED.util.cloneMessage
            : (msg) => msg;

        node.name = config.name;
        node.topic = normalizeTopic(config.topic);

        registerGetNode(node.topic, node);

        node.on("input", (msg, send, done) => {
            if (hasCachedMessage(node.topic)) {
                send(cloneMessage(getCachedMessage(node.topic)));
            } else {
                node.debug(`No cached message for topic "${node.topic}"`);
                node.status(statusForTopic(node.topic));
            }

            if (done) {
                done();
            }
        });

        node.on("close", () => {
            unregisterGetNode(node.topic, node);
        });
    }

    RED.nodes.registerType("caching-link-get", CachingLinkGetNode);
};

