import { App } from "@capacitor/app"
import { LiveUpdate } from "@capawesome/capacitor-live-update"
import { liveUpdateManifestUrl } from "@inglorious/supabase"
import { watchLiveUpdate } from "@inglorious/web/native/live-update"

import { store } from "./store"

// Only release builds carry one: a development build must not turn into production.
const release = Number(import.meta.env.VITE_LIVE_UPDATE_RELEASE)

if (release) {
  watchLiveUpdate({
    plugin: LiveUpdate,
    app: App,
    store,
    manifestUrl: liveUpdateManifestUrl(import.meta.env.VITE_SUPABASE_URL),
    release,
  })
}
