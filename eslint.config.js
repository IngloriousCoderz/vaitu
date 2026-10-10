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
  ...nodeOnly.map((config) => ({ ...config, files: nodeFiles })),
]
