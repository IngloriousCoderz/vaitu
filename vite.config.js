import path from "node:path"
import { fileURLToPath } from "node:url"

import { minifyTemplateLiterals } from "rollup-plugin-minify-template-literals"
import { defineConfig } from "vite"
import { ViteImageOptimizer } from "vite-plugin-image-optimizer"
import { VitePWA } from "vite-plugin-pwa"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    VitePWA({
      injectRegister: false,
      // "prompt" on purpose: watchPwaUpdate sends SKIP_WAITING itself, and the
      // plugin's own register script would add a second, competing reload.
      registerType: "prompt",
      pwaAssets: {
        config: true,
      },
      manifest: {
        name: "Vaitu",
        short_name: "Vaitu",
        description: "Vaitu — find wedding work.",
        theme_color: "#f6f3ea",
        background_color: "#f6f3ea",
        display: "standalone",
        start_url: "/",
      },
      workbox: {
        importScripts: ["sw-push.js"],
      },
    }),
    ViteImageOptimizer(),
  ],

  build: {
    rollupOptions: {
      plugins: [minifyTemplateLiterals()],
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})
