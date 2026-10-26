import { App } from "@capacitor/app"
import { isNative } from "@inglorious/web/mobile"

import { store } from "./store"

// The native counterpart of src/pwa.js. The binaries carry their web code, so
// only the store can update them: check the platform's minimum build at
// launch and each time the app comes back to the foreground, which is when a
// freshly raised minimum should catch someone who never closes the app.
if (isNative()) {
  store.notify("#appVersion:check")
  App.addListener("resume", () => store.notify("#appVersion:check"))
}
