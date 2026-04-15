"use strict";

const {
    assertValidTopic,
    displayTopic,
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
            try {
                assertValidTopic(node.topic, "caching-link-get");

                if (hasCachedMessage(node.topic)) {
                    const inboundClone = cloneMessage(msg);
                    const cachedClone = cloneMessage(getCachedMessage(node.topic));
                    const mergedMessage = Object.assign({}, inboundClone, cachedClone);

                    if (Object.prototype.hasOwnProperty.call(inboundClone, "_msgid")) {
                        mergedMessage._msgid = inboundClone._msgid;
                    }

                    send(mergedMessage);
                    node.status(statusForTopic(node.topic));
                } else {
                    node.debug(`No cached message for topic "${displayTopic(node.topic)}"`);
                    node.status(statusForTopic(node.topic));
                }
            } catch (err) {
                node.error(err, msg);
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

