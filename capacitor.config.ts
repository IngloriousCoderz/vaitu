import { existsSync, readFileSync } from "node:fs"

import type { CapacitorConfig } from "@capacitor/cli"

const LIVE_UPDATE_PUBLIC_KEY = "live-update.pub.pem"
const READY_TIMEOUT_MS = 10_000

// One line, as the plugin reads it. Without it, any bundle would be accepted.
const publicKey = existsSync(LIVE_UPDATE_PUBLIC_KEY)
  ? readFileSync(LIVE_UPDATE_PUBLIC_KEY, "utf8").replaceAll("\n", "")
  : undefined

const config: CapacitorConfig = {
  appId: "it.ingloriouscoderz.vaitu",
  appName: "Vaitu",
  webDir: "dist",
  server: {
    androidScheme: "http",
  },
  plugins: {
    LiveUpdate: {
      publicKey,
      readyTimeout: READY_TIMEOUT_MS,
      autoBlockRolledBackBundles: true,
      autoDeleteBundles: true,
    },
    SystemBars: {
      initialViewportFitValueHint: "cover",
    },
    // In the foreground the app shows the news as a toast: only the badge.
    FirebaseMessaging: {
      presentationOptions: ["badge"],
    },
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/messaging": { symlink: true },
        },
      },
    },
  },
}

export default config
