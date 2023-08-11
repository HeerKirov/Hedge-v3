const fs = require("fs")
const utils = require("./utils")

const version = utils.getServerVersion()

if(!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Getting version from gradle failed. version is ${version}.`)

const text = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESOURCE_VERSION = void 0;
exports.RESOURCE_VERSION = {
    "server": "${version}"
};`

fs.writeFileSync("./target/components/resource/version.js", text)