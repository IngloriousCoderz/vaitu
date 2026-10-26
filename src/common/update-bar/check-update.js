import { HOUR_MS } from "../../constants/index.js"

// The update-check engine, wired by src/pwa.js and exercised here in tests:
// no side effects at import — every host object (worker registration,
// document, notify) arrives by argument, so the decisions that used to hide
// behind browser globals can be read straight from a test.
//
// Updates are not optional. A downloaded version is applied on its own
// wherever nobody is mid-task: at boot, before anything is touched, and each
// time the app leaves or comes back to the foreground. Only a version that
// lands while someone is using the app is announced — the pill offers to move
// over at once, and the next trip to the background moves over regardless.
export const createUpdateCheck = ({
  checkEveryMs = HOUR_MS,
  notify = () => {},
  document = window.document,
  hadController = Boolean(navigator.serviceWorker?.controller),
} = {}) => {
  let announced = null
  let isApplying = false

  const announce = (worker) => {
    if (!hadController || isApplying || announced === worker) return
    announced = worker
    notify("#pwaUpdate:ready")
  }

  // One reload per waiting worker: the hidden and visible events of a single
  // trip to the background must not send it twice, nor check for another
  // version while the reload is on its way.
  const apply = (registration) => {
    if (isApplying) return true
    if (!registration?.waiting) return false
    isApplying = true
    notify("#pwaUpdate:refresh")
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
    apply(registration)
    watch(registration)
    const check = () => registration?.update()
    const interval = setInterval(check, checkEveryMs)
    document.addEventListener("visibilitychange", () => {
      if (apply(registration)) return
      if (!document.hidden) check()
    })
    return { check, stop: () => clearInterval(interval) }
  }

  return { attach, announce, apply }
}
