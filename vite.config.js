import path from "node:path"
import { fileURLToPath } from "node:url"

import { minifyTemplateLiterals } from "rollup-plugin-minify-template-literals"
import { defineConfig } from "vite"
import { ViteImageOptimizer } from "vite-plugin-image-optimizer"
import { VitePWA } from "vite-plugin-pwa"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    VitePWA({
      injectRegister: false,
      // The worker waits for the SKIP_WAITING message regardless: the plugin
      // only auto-installs skipWaiting for the register script it injects,
      // which this app does not use, and `src/pwa.js` hands the registration
      // to `watchPwaUpdate` from `@inglorious/web/pwa`, which sends it.
      // Naming that truthfully also keeps the register module from adding a
      // second, competing reload on activation.
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
