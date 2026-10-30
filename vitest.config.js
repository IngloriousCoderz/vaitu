import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Deliberately separate from vite.config.js. That config carries the PWA and
// image optimizer plugins, which have no business loading for a unit test and
// make `vitest` noticeably slower to start.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  test: {
    environment: "node",
    setupFiles: ["src/test/setup.js"],

    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.js"],
          exclude: ["src/**/*.integration.test.js"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.js"],
        },
      },
    ],
  },
})
