import { HOUR_MS, UPDATE_DEFER_KEY } from "../../constants/index.js"

// The update-check engine, wired by src/pwa.js and exercised here in tests:
// no side effects at import — every host object (worker registration,
// storage, document, notify) arrives by argument, so the decisions that
// used to hide behind browser globals can be read straight from a test.
export const createUpdateCheck = ({
  checkEveryMs = HOUR_MS,
  notify = () => {},
  storage = window.localStorage,
  document = window.document,
  hadController = Boolean(navigator.serviceWorker?.controller),
} = {}) => {
  let announced = null

  const announce = (worker) => {
    if (!hadController || announced === worker) return
    announced = worker
    notify("#pwaUpdate:updateReady")
  }

  // "Next time" on the update dialog arms a one-shot deferral: this is where
  // it is spent — the first cold open after the choice reloads onto the
  // waiting worker once. The flag always goes, whichever way: a deferral that
  // outlived its worker is spent, not carried (the next update asks again).
  const spendDeferral = (registration) => {
    if (!storage.getItem(UPDATE_DEFER_KEY)) return false
    storage.removeItem(UPDATE_DEFER_KEY)
    if (registration?.waiting) notify("#pwaUpdate:updateRefresh")
    return true
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

  const attach = (registration) => {
    // The deferred reload goes first, and silences the announcement: the
    // pill would only flash before the reload lands.
    const spent = spendDeferral(registration)
    if (spent) announced = registration?.waiting ?? undefined
    watch(registration)
    const check = () => registration?.update()
    const interval = setInterval(check, checkEveryMs)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) check()
    })
    return { check, stop: () => clearInterval(interval) }
  }

  return { attach, announce, spendDeferral }
}
