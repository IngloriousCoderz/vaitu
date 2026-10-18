import { networkInterfaces } from "node:os"

import type { CapacitorConfig } from "@capacitor/cli"
import { VITE_DEV_PORT } from "./src/constants/index.js"

// First non-internal IPv4 (the LAN address phones reach).
function lanIp() {
  for (const infos of Object.values(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === "IPv4" && !info.internal) return info.address
    }
  }
  return null
}

// Live reload only for :dev scripts (CAP_LIVE=1 sets it, address
// auto-detects). Override with CAP_SERVER_URL (VPNs, multiple NICs).
// Production builds omit server.url and use bundled dist.
const liveIp = process.env.CAP_SERVER_URL ?? undefined
const autoIp = !liveIp && process.env.CAP_LIVE === "1" ? lanIp() : null
const devServerUrl =
  liveIp ?? (autoIp ? `http://${autoIp}:${VITE_DEV_PORT}` : undefined)

const config: CapacitorConfig = {
  appId: "it.ingloriouscoderz.vaitu",
  appName: "Vaitu",
  webDir: "dist",
  server: {
    // http://localhost stays a secure context (mic works) and same-scheme
    // http API calls avoid mixed-content blocks.
    androidScheme: "http",
    ...(devServerUrl ? { url: devServerUrl, cleartext: true } : {}),
  },
  plugins: {
    SystemBars: {
      // index.html asks for viewport-fit=cover. Saying so up front spares
      // Android a first frame laid out for padding, and the jump after it.
      initialViewportFitValueHint: "cover",
    },
  },
}

export default config
