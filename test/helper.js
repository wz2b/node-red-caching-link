"use strict";

const path = require("path");
const helper = require("node-red-node-test-helper");
const { resetRuntimeStateForTests } = require("../src/message-cache");

helper.init(path.join(__dirname, "support", "node-red-runtime", "red.js"));

helper.resetRuntimeState = resetRuntimeStateForTests;

module.exports = helper;

