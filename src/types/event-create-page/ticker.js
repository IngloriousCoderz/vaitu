import { MS_PER_SECOND } from "../../constants.js"

// Recording elapsed ticker. Owned by the render layer (index.js), which
// holds a stable api — handler api proxies are revoked after dispatch,
// so handlers must never schedule deferred notifies. Handlers only stop it.
let timer = null

export function isTicking() {
  return timer !== null
}

export function startTick(notify) {
  stopTick()
  timer = setInterval(notify, MS_PER_SECOND)
}

export function stopTick() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
