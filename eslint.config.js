import browser from "@inglorious/eslint-config/browser"

const shared = Array.isArray(browser) ? browser : [browser]

export default [
  ...shared,
  {
    ignores: ["android/**", "ios/**", "dist/**"],
  },
]
