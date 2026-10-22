import { isNative } from "@inglorious/web/mobile"
import { registerSW } from "virtual:pwa-register"

import { HOUR_MS, UPDATE_DEFER_KEY } from "./constants/index.js"
import { store } from "./store"

// The generated worker never activates itself here: vite-plugin-pwa builds
// that in only for the register script it injects into the markup, which
// this app does not use (injectRegister: false). Left alone, every update
// sits in the waiting slot forever — the exact bug where an installed PWA
// keeps the same version until it is uninstalled. So the page runs the flow
// itself: checks on coming back to the foreground plus one pass per hour for
// an app abandoned open (each is only a byte compare on the worker script,
// the same check the browser does by itself on every navigation), an
// announcement the moment an update is fully downloaded, and — in the type
// handlers — the SKIP_WAITING message the generated worker listens for,
// followed by the reload once it has taken over.
if (!isNative()) {
  let announced = null
  // A first-ever install has no old version to move from, so it stays
  // silent: the bar is for a page that was already running a previous one.
  const hadController = Boolean(navigator.serviceWorker?.controller)

  // "Next time" on the update dialog arms a one-shot deferral: this is where
  // it is spent — the first cold open after the choice reloads onto the
  // waiting worker once. The flag always goes, whichever way: a deferral that
  // outlived its worker is spent, not carried (the next update asks again).
  const spendDeferral = (registration) => {
    if (!window.localStorage.getItem(UPDATE_DEFER_KEY)) return false
    window.localStorage.removeItem(UPDATE_DEFER_KEY)
    if (registration?.waiting) store.notify("#pwaUpdate:updateRefresh")
    return true
  }

  const announce = (worker) => {
    if (!hadController || announced === worker) return
    announced = worker
    store.notify("#pwaUpdate:updateReady")
  }

  const watch = (registration) => {
    if (registration.waiting) announce(registration.waiting)
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed") announce(worker)
        if (worker.state === "activated") announced = null
      })
    })
  }

  registerSW({
    onRegisteredSW(url, registration) {
      if (!registration) return
      // The deferred reload goes first, and silences the announcement: the
      // pill would only flash before the reload lands.
      const spent = spendDeferral(registration)
      if (spent) announced = registration.waiting ?? undefined
      watch(registration)
      const check = () => registration.update()
      setInterval(check, HOUR_MS)
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) check()
      })
    },
  })
}
