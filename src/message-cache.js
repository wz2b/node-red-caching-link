"use strict";

const messageCache = Object.create(null);
const inNodeRegistry = new Map();
const getNodeRegistry = new Map();
const outNodeRegistry = new Map();

function normalizeTopic(topic) {
    return typeof topic === "string" ? topic : "";
}

function hasCachedMessage(topic) {
    return Object.prototype.hasOwnProperty.call(messageCache, normalizeTopic(topic));
}

function getCachedMessage(topic) {
    return messageCache[normalizeTopic(topic)];
}

function statusForTopic(topic) {
    return hasCachedMessage(topic)
        ? { fill: "green", shape: "dot", text: "cached" }
        : { fill: "grey", shape: "ring", text: "no cache" };
}

function updateGetNodeStatus(node, topic) {
    if (node && typeof node.status === "function") {
        node.status(statusForTopic(topic));
    }
}

function getOrCreateTopicSet(registry, topic) {
    const normalizedTopic = normalizeTopic(topic);
    let registeredNodes = registry.get(normalizedTopic);

    if (!registeredNodes) {
        registeredNodes = new Set();
        registry.set(normalizedTopic, registeredNodes);
    }

    return registeredNodes;
}

function updateOutNodeStatuses(topic) {
    const normalizedTopic = normalizeTopic(topic);
    const registeredOutNodes = outNodeRegistry.get(normalizedTopic);

    if (!registeredOutNodes) {
        return;
    }

    const receiverCount = getRegisteredInNodes(normalizedTopic).length;
    registeredOutNodes.forEach((node) => {
        if (node && typeof node.updateReceiverStatus === "function") {
            node.updateReceiverStatus(receiverCount);
        }
    });
}

function registerInNode(topic, node) {
    const normalizedTopic = normalizeTopic(topic);
    const registeredNodes = getOrCreateTopicSet(inNodeRegistry, normalizedTopic);

    registeredNodes.add(node);
    updateOutNodeStatuses(normalizedTopic);
}

function unregisterInNode(topic, node) {
    const normalizedTopic = normalizeTopic(topic);
    const registeredNodes = inNodeRegistry.get(normalizedTopic);

    if (!registeredNodes) {
        return;
    }

    registeredNodes.delete(node);

    if (registeredNodes.size === 0) {
        inNodeRegistry.delete(normalizedTopic);
    }

    updateOutNodeStatuses(normalizedTopic);
}

function getRegisteredInNodes(topic) {
    const normalizedTopic = normalizeTopic(topic);
    const registeredNodes = inNodeRegistry.get(normalizedTopic);

    if (!registeredNodes) {
        return [];
    }

    return Array.from(registeredNodes).filter((node) => node && typeof node.receive === "function");
}

function getRegisteredInNodeCount(topic) {
    return getRegisteredInNodes(topic).length;
}

function updateRegisteredGetNodes(topic) {
    const normalizedTopic = normalizeTopic(topic);
    const registeredNodes = getNodeRegistry.get(normalizedTopic);

    if (!registeredNodes) {
        return;
    }

    registeredNodes.forEach((node) => updateGetNodeStatus(node, normalizedTopic));
}

function setCachedMessage(topic, msg) {
    const normalizedTopic = normalizeTopic(topic);

    messageCache[normalizedTopic] = msg;
    updateRegisteredGetNodes(normalizedTopic);

    return messageCache[normalizedTopic];
}

function registerGetNode(topic, node) {
    const normalizedTopic = normalizeTopic(topic);
    const registeredNodes = getOrCreateTopicSet(getNodeRegistry, normalizedTopic);

    registeredNodes.add(node);
    updateGetNodeStatus(node, normalizedTopic);
}

function unregisterGetNode(topic, node) {
    const normalizedTopic = normalizeTopic(topic);
    const registeredNodes = getNodeRegistry.get(normalizedTopic);

    if (!registeredNodes) {
        return;
    }

    registeredNodes.delete(node);

    if (registeredNodes.size === 0) {
        getNodeRegistry.delete(normalizedTopic);
    }
}

function registerOutNode(topic, node) {
    const normalizedTopic = normalizeTopic(topic);
    const registeredNodes = getOrCreateTopicSet(outNodeRegistry, normalizedTopic);

    registeredNodes.add(node);
    updateOutNodeStatuses(normalizedTopic);
}

function unregisterOutNode(topic, node) {
    const normalizedTopic = normalizeTopic(topic);
    const registeredNodes = outNodeRegistry.get(normalizedTopic);

    if (!registeredNodes) {
        return;
    }

    registeredNodes.delete(node);

    if (registeredNodes.size === 0) {
        outNodeRegistry.delete(normalizedTopic);
    }
}

function clearMessageCache() {
    Object.keys(messageCache).forEach((topic) => {
        delete messageCache[topic];
    });

    getNodeRegistry.forEach((registeredNodes, topic) => {
        registeredNodes.forEach((node) => updateGetNodeStatus(node, topic));
    });

    inNodeRegistry.clear();
    outNodeRegistry.clear();
    getNodeRegistry.clear();
}

module.exports = {
    clearMessageCache,
    getCachedMessage,
    getRegisteredInNodeCount,
    getRegisteredInNodes,
    hasCachedMessage,
    messageCache,
    normalizeTopic,
    registerInNode,
    registerGetNode,
    registerOutNode,
    setCachedMessage,
    statusForTopic,
    unregisterInNode,
    unregisterOutNode,
    unregisterGetNode
};

