// Ensure ts-node compiles the test tree with the test tsconfig (transpileOnly),
// set here (not via CLI) so it works cross-platform without a cross-env dependency.
process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || "tsconfig.test.json";

module.exports = {
  require: "ts-node/register",
  spec: "test/**/*.test.ts",
  extension: ["ts"],
  recursive: true,
  timeout: 5000,
};
