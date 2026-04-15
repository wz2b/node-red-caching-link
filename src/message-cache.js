"use strict";

const messageCache = Object.create(null);
const inNodeRegistry = new Map();
const getNodeRegistry = new Map();
const outNodeRegistry = new Map();

function normalizeTopic(topic) {
    return typeof topic === "string" ? topic.trim() : "";
}

function isTopicConfigured(topic) {
    return normalizeTopic(topic).length > 0;
}

function displayTopic(topic) {
    return isTopicConfigured(topic) ? normalizeTopic(topic) : "(missing topic)";
}

function invalidTopicStatus() {
    return { fill: "red", shape: "ring", text: "invalid topic" };
}

function hasCachedMessage(topic) {
    if (!isTopicConfigured(topic)) {
        return false;
    }

    return Object.prototype.hasOwnProperty.call(messageCache, normalizeTopic(topic));
}

function getCachedMessage(topic) {
    if (!isTopicConfigured(topic)) {
        return undefined;
    }

    return messageCache[normalizeTopic(topic)];
}

function statusForTopic(topic) {
    if (!isTopicConfigured(topic)) {
        return invalidTopicStatus();
    }

    return hasCachedMessage(topic)
        ? { fill: "green", shape: "dot", text: "cached" }
        : { fill: "grey", shape: "ring", text: "no cache" };
}

function receiverStatusForTopic(topic, receiverCount) {
    if (!isTopicConfigured(topic)) {
        return invalidTopicStatus();
    }

    if (receiverCount === 0) {
        return { fill: "yellow", shape: "ring", text: "no receivers" };
    }

    return {
        fill: "green",
        shape: "dot",
        text: `${receiverCount} receiver${receiverCount === 1 ? "" : "s"}`
    };
}

function inNodeStatusForTopic(topic) {
    if (!isTopicConfigured(topic)) {
        return { fill: "red", shape: "ring", text: "missing topic" };
    }

    return { fill: "blue", shape: "dot", text: normalizeTopic(topic) };
}

function assertValidTopic(topic, nodeType) {
    const normalizedTopic = normalizeTopic(topic);

    if (!normalizedTopic) {
        throw new Error(`${nodeType} requires a non-empty topic`);
    }

    return normalizedTopic;
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

    if (!normalizedTopic) {
        return;
    }

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

    if (!normalizedTopic) {
        return [];
    }

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
    const normalizedTopic = assertValidTopic(topic, "caching-link-out");

    messageCache[normalizedTopic] = msg;
    updateRegisteredGetNodes(normalizedTopic);

    return messageCache[normalizedTopic];
}

function registerGetNode(topic, node) {
    const normalizedTopic = normalizeTopic(topic);

    if (!normalizedTopic) {
        updateGetNodeStatus(node, normalizedTopic);
        return;
    }

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

    if (!normalizedTopic) {
        if (node && typeof node.updateReceiverStatus === "function") {
            node.updateReceiverStatus(0);
        }
        return;
    }

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

function clearRetainedMessages() {
    Object.keys(messageCache).forEach((topic) => {
        delete messageCache[topic];
    });

    getNodeRegistry.forEach((registeredNodes, topic) => {
        registeredNodes.forEach((node) => updateGetNodeStatus(node, topic));
    });

}

function resetRegistries() {
    inNodeRegistry.clear();
    outNodeRegistry.clear();
    getNodeRegistry.clear();
}

function resetRuntimeStateForTests() {
    clearRetainedMessages();
    resetRegistries();
}

module.exports = {
    assertValidTopic,
    clearRetainedMessages,
    displayTopic,
    getCachedMessage,
    getRegisteredInNodeCount,
    getRegisteredInNodes,
    hasCachedMessage,
    inNodeStatusForTopic,
    invalidTopicStatus,
    isTopicConfigured,
    messageCache,
    normalizeTopic,
    registerInNode,
    registerGetNode,
    registerOutNode,
    resetRegistries,
    resetRuntimeStateForTests,
    receiverStatusForTopic,
    setCachedMessage,
    statusForTopic,
    unregisterInNode,
    unregisterOutNode,
    unregisterGetNode
};

