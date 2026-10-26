import { isNative } from "@inglorious/web/mobile"
import { watchPwaUpdate } from "@inglorious/web/pwa"
import { registerSW } from "virtual:pwa-register"

import { store } from "./store"

// Keeps the installed app on its latest version: `watchPwaUpdate` applies a
// downloaded one at launch and on every trip to or from the background, and
// announces one that lands mid-session to the `pwaUpdate` entity, which
// raises the "Update now" pill. The native apps carry their web code in the
// binary and update through the stores instead (src/native-update.js).
if (!isNative()) {
  registerSW({
    onRegisteredSW(url, registration) {
      if (registration) watchPwaUpdate(registration, store)
    },
  })
}
