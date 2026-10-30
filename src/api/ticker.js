import { MS_PER_SECOND } from "../constants/index.js"

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
