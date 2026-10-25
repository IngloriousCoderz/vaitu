import { MS_PER_SECOND } from "../constants/index.js"

// Repeating notifies, one per key. A handler starts one with its api, which is
// the store's own and outlives the handler, and stops it by the same key.
const timers = {}

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
