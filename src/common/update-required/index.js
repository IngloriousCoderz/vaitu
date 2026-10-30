import { App as NativeApp } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { handleAsync } from "@inglorious/store/async"

import { fetchAppVersion } from "../../api/app-versions.js"
import { isOutdated } from "./is-outdated.js"
import * as renderers from "./template.js"

// A failed check keeps the last answer: the gate never closes or opens on a
// guess.
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

  storeOpen(entity) {
    window.location.assign(entity.storeUrl)
  },
}
