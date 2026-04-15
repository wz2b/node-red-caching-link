"use strict";

const {
    getRegisteredInNodes,
    normalizeTopic,
    registerOutNode,
    setCachedMessage,
    unregisterOutNode
} = require("./message-cache");

module.exports = function (RED) {
    function formatReceiverStatus(receiverCount) {
        if (receiverCount === 0) {
            return { fill: "yellow", shape: "ring", text: "no receivers" };
        }

        return {
            fill: "green",
            shape: "dot",
            text: `${receiverCount} receiver${receiverCount === 1 ? "" : "s"}`
        };
    }

    function CachingLinkOutNode(config) {
        RED.nodes.createNode(this, config);

        const node = this;
        const cloneMessage = RED.util && typeof RED.util.cloneMessage === "function"
            ? RED.util.cloneMessage
            : (msg) => msg;

        node.name = config.name;
        node.topic = normalizeTopic(config.topic);
        node.updateReceiverStatus = (receiverCount) => {
            node.status(formatReceiverStatus(receiverCount));
        };

        registerOutNode(node.topic, node);

        node.on("input", (msg, send, done) => {
            try {
                const targets = getRegisteredInNodes(node.topic);

                node.updateReceiverStatus(targets.length);
                setCachedMessage(node.topic, cloneMessage(msg));
                targets.forEach((target) => target.receive(cloneMessage(msg)));

                if (done) {
                    done();
                }
            } catch (err) {
                if (done) {
                    done(err);
                } else {
                    node.error(err, msg);
                }
            }
        });

        node.on("close", () => {
            unregisterOutNode(node.topic, node);
        });
    }

    RED.nodes.registerType("caching-link-out", CachingLinkOutNode);
};

