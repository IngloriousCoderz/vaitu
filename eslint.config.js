import browser from "@inglorious/eslint-config/browser"
import node from "@inglorious/eslint-config/node"

const shared = Array.isArray(browser) ? browser : [browser]
const nodeOnly = Array.isArray(node) ? node : [node]

const nodeFiles = ["scripts/**", "*.config.js"]

export default [
  {
    ignores: ["android/**", "ios/**", "dist/**"],
  },
  ...shared,
  ...nodeOnly.map((config) => ({ ...config, files: nodeFiles })),
  {
    files: nodeFiles,
    rules: { "no-console": "off" },
  },
]
