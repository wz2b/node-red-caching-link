"use strict";

const {
    assertValidTopic,
    displayTopic,
    getCacheAgeMs,
    getCachedEntry,
    getStatusForGetNode,
    isCacheEntryExpired,
    normalizeTopic,
    registerGetNode,
    unregisterGetNode
} = require("./message-cache");

module.exports = function (RED) {
    function parseMaxAgeSeconds(value) {
        const numericValue = Number(value);

        if (!Number.isFinite(numericValue) || numericValue < 0) {
            return 0;
        }

        return numericValue;
    }

    function CachingLinkGetNode(config) {
        RED.nodes.createNode(this, config);

        const node = this;
        const cloneMessage = RED.util && typeof RED.util.cloneMessage === "function"
            ? RED.util.cloneMessage
            : (msg) => msg;

        node.name = config.name;
        node.topic = normalizeTopic(config.topic);
        node.maxAgeSeconds = parseMaxAgeSeconds(config.maxAgeSeconds);
        node.outputExpired = Boolean(config.outputExpired);

        registerGetNode(node.topic, node);

        node.on("input", (msg, send, done) => {
            try {
                assertValidTopic(node.topic, "caching-link-get");
                const cacheEntry = getCachedEntry(node.topic);

                if (cacheEntry) {
                    const cacheExpired = isCacheEntryExpired(cacheEntry, node.maxAgeSeconds);
                    const cacheAgeMs = getCacheAgeMs(cacheEntry);

                    if (cacheExpired && !node.outputExpired) {
                        node.debug(`Cached value for topic "${displayTopic(node.topic)}" is expired and was suppressed`);
                        node.status(getStatusForGetNode(node.topic, "expired"));
                    } else {
                        const inboundClone = cloneMessage(msg);
                        const cachedClone = cloneMessage(cacheEntry.message);
                        const mergedMessage = Object.assign({}, inboundClone, cachedClone);

                        if (Object.prototype.hasOwnProperty.call(inboundClone, "_msgid")) {
                            mergedMessage._msgid = inboundClone._msgid;
                        }

                        mergedMessage.cacheAgeMs = cacheAgeMs;
                        mergedMessage.cacheUpdatedAt = cacheEntry.updatedAtMs;
                        mergedMessage.cacheExpired = cacheExpired;

                        send(mergedMessage);
                        node.status(getStatusForGetNode(node.topic, cacheExpired ? "expired" : "cached"));
                    }
                } else {
                    node.debug(`No cached value for topic "${displayTopic(node.topic)}"`);
                    node.status(getStatusForGetNode(node.topic, "no-cache"));
                }
            } catch (err) {
                node.error(err, msg);
                node.status(getStatusForGetNode(node.topic, "invalid"));
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


