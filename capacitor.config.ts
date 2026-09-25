import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.inglorious.vaituFe",
  appName: "vaitu-fe",
  webDir: "dist",
  server: {
    url: "http://192.168.1.51:5173",
    cleartext: true,
  },
}

export default config
