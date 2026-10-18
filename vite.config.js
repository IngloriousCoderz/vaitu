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
      registerType: "autoUpdate",
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
