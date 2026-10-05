import { networkInterfaces } from "node:os"

import type { CapacitorConfig } from "@capacitor/cli"
import { VITE_DEV_PORT } from "./src/constants.js"

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
  appId: "com.inglorious.vaituFe",
  appName: "vaitu-fe",
  webDir: "dist",
  ...(devServerUrl ? { server: { url: devServerUrl, cleartext: true } } : {}),
}

export default config
