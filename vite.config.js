import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { minifyTemplateLiterals } from "rollup-plugin-minify-template-literals"
import { defineConfig, loadEnv } from "vite"
import { ViteImageOptimizer } from "vite-plugin-image-optimizer"
import { VitePWA } from "vite-plugin-pwa"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const { version } = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf8"),
)

export default defineConfig(({ mode }) => ({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(version),
  },

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

  preview: {
    headers: vercelHeaders(loadEnv(mode, __dirname, "VITE_").VITE_SUPABASE_URL),
  },
}))

// The preview serves what Vercel serves, pointed at the Supabase this build
// talks to, so the headers can be tried and scanned locally.
function vercelHeaders(supabaseUrl) {
  const { headers } = JSON.parse(
    readFileSync(path.resolve(__dirname, "vercel.json"), "utf8"),
  )
  const { origin, host, protocol } = new URL(supabaseUrl)
  const isSecure = protocol === "https:"
  const socket = `${isSecure ? "wss" : "ws"}://${host}`
  return Object.fromEntries(
    headers[0].headers.map(({ key, value }) => {
      const local = value
        .replaceAll(/wss:\/\/[a-z0-9]+\.supabase\.co/g, socket)
        .replaceAll(/https:\/\/[a-z0-9]+\.supabase\.co/g, origin)
      return [
        key,
        isSecure ? local : local.replace("; upgrade-insecure-requests", ""),
      ]
    }),
  )
}
