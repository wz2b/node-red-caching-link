"use strict";

const path = require("path");
const helper = require("node-red-node-test-helper");

helper.init(path.join(__dirname, "support", "node-red-runtime", "red.js"));

module.exports = helper;

