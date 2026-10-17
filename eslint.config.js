import browser from "@inglorious/eslint-config/browser"
import node from "@inglorious/eslint-config/node"

const shared = Array.isArray(browser) ? browser : [browser]
const nodeOnly = Array.isArray(node) ? node : [node]

// Build-time scripts run on Node, not in the browser.
const nodeFiles = ["scripts/**", "*.config.js"]

export default [
  {
    ignores: ["android/**", "ios/**", "dist/**"],
  },
  ...shared,
  {
    // 0 and 1 mean themselves: an empty count, the first index, one more.
    // Naming them ZERO or FIRST_INDEX adds a lookup and no meaning. Tests keep
    // the shared config's rule, which is off.
    ignores: ["**/*.test.js"],
    rules: { "no-magic-numbers": ["warn", { ignore: [0, 1] }] },
  },
  ...nodeOnly.map((config) => ({ ...config, files: nodeFiles })),
  {
    // A script that reports results has to print them.
    files: nodeFiles,
    rules: { "no-console": "off" },
  },
]
