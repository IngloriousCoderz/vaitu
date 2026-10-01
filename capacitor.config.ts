import type { CapacitorConfig } from "@capacitor/cli"

const devServerUrl = process.env.CAP_SERVER_URL ?? "http://192.168.1.51:5173"

const config: CapacitorConfig = {
  appId: "com.inglorious.vaituFe",
  appName: "vaitu-fe",
  webDir: "dist",
  server: {
    url: devServerUrl,
    cleartext: true,
  },
}

export default config
