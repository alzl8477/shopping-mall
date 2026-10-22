const path = require("node:path");

const serverRoot = path.resolve(__dirname, "../..");
const mongooseEntry = require.resolve("mongoose", { paths: [serverRoot] });

module.exports = require(mongooseEntry);
