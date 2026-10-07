import { MS_PER_SECOND } from "./constants.js"

// Deferred notifies. Owned by the render layer (index.js), which holds a
// stable api — handler api proxies are revoked after dispatch, so handlers
// must never schedule deferred notifies. Handlers only stop their own key.
const timers = {}

export function isTicking(key) {
  return timers[key] != null
}

export function startTick(key, notify, intervalMs = MS_PER_SECOND) {
  stopTick(key)
  timers[key] = setInterval(notify, intervalMs)
}

export function stopTick(key) {
  if (timers[key]) {
    clearInterval(timers[key])
    delete timers[key]
  }
}
