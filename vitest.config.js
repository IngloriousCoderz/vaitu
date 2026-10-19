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
    // Everything under src/ is plain logic and runs fine without a DOM.
    environment: "node",
    include: ["src/**/*.test.js"],
    setupFiles: ["src/test/setup.js"],
  },
})
