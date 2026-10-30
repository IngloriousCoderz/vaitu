import { networkInterfaces } from "node:os"

import type { CapacitorConfig } from "@capacitor/cli"
import { VITE_DEV_PORT } from "./src/constants/index.js"

function lanIp() {
  for (const infos of Object.values(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === "IPv4" && !info.internal) return info.address
    }
  }
  return null
}

const liveIp = process.env.CAP_SERVER_URL ?? undefined
const autoIp = !liveIp && process.env.CAP_LIVE === "1" ? lanIp() : null
const devServerUrl =
  liveIp ?? (autoIp ? `http://${autoIp}:${VITE_DEV_PORT}` : undefined)

const config: CapacitorConfig = {
  appId: "it.ingloriouscoderz.vaitu",
  appName: "Vaitu",
  webDir: "dist",
  server: {
    androidScheme: "http",
    ...(devServerUrl ? { url: devServerUrl, cleartext: true } : {}),
  },
  plugins: {
    SystemBars: {
      initialViewportFitValueHint: "cover",
    },
  },
}

export default config
