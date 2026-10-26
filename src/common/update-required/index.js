import { App as NativeApp } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { handleAsync } from "@inglorious/store/async"

import { fetchAppVersion } from "../../api/app-versions.js"
import { isOutdated } from "./is-outdated.js"
import * as renderers from "./template.js"

// The native gate. The iOS and Android apps carry their web code inside the
// binary, so the service worker behind the update pill never reaches them:
// `src/native-update.js` asks for a check at launch and on every resume, and
// while the installed build is below the platform's `min_build` the shell
// renders nothing but this screen, sending the user to the store. A failed
// check (offline, timeout) keeps the last answer: the gate never closes on a
// guess, and never opens on one either.
export const AppVersion = {
  ...renderers,

  create(entity) {
    entity.isUpdateRequired = false
    entity.storeUrl = null
  },

  ...handleAsync("check", {
    async run() {
      const [info, version] = await Promise.all([
        NativeApp.getInfo(),
        fetchAppVersion(Capacitor.getPlatform()),
      ])
      return { build: Number(info.build), version }
    },
    success(entity, { build, version }) {
      entity.isUpdateRequired = isOutdated(build, version)
      entity.storeUrl = version?.store_url ?? null
    },
    error() {},
  }),

  // An address outside the app: Capacitor hands it to the system, which
  // opens the App Store or Play Store app on its listing.
  storeOpen(entity) {
    window.location.assign(entity.storeUrl)
  },
}
