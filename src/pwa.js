import { isNative } from "@inglorious/web/mobile"
import { registerSW } from "virtual:pwa-register"

import { createUpdateCheck } from "./common/update-bar/check-update.js"
import { store } from "./store"

// The generated worker never activates itself here: vite-plugin-pwa builds
// that in only for the register script it injects into the markup, which
// this app does not use (injectRegister: false). Left alone, every update
// sits in the waiting slot forever — the exact bug where an installed PWA
// keeps the same version until it is uninstalled. So the page runs the flow
// itself, and its decisions live beside the pill in
// ./common/update-bar/check-update.js, ready for the suite to read them
// without a browser attached: checks on coming back to the foreground plus
// one pass per hour for an app abandoned open, the update applied on its own
// at boot and on every trip to the background, a pill when one lands
// mid-session, and — in the type handlers — the SKIP_WAITING message the
// generated worker listens for, followed by the reload once it has taken
// over.
if (!isNative()) {
  const check = createUpdateCheck({
    notify: (event) => store.notify(event),
    hadController: Boolean(navigator.serviceWorker?.controller),
  })

  registerSW({
    onRegisteredSW(url, registration) {
      if (registration) check.attach(registration)
    },
  })
}
