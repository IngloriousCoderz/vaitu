import { handleAsync } from "@inglorious/store/async"
import { isNative } from "@inglorious/web/mobile"

import { isPushSupported, syncPushSubscription } from "../../api/push.js"
import { PUSH_DECLINE_KEY } from "../../constants/index.js"
import { PushPromptBar as renderers } from "./template.js"

// Asks for the permission Web Push needs, in a pill rather than the browser's
// dialog straight away: the dialog only comes up once the user says yes, and
// a browser that saw it refused never shows it again. "Not now" stops the
// pill on this browser for good; the browser's own settings can still allow
// notifications later.
//
// Once allowed, every sign-in files this browser's subscription under whoever
// signed in. Signing out removes it (see endSession in src/api/session.js).
// The native apps will get their pushes another way, so none of this runs
// there.
export const PushPrompt = {
  ...renderers,

  create(entity) {
    entity.isOpen = false
  },

  sessionStart(entity, _, api) {
    if (isNative() || !isPushSupported()) return
    if (Notification.permission === "granted") {
      api.notify(`#${entity.id}:sync`)
      return
    }
    entity.isOpen = Notification.permission === "default" && !isDeclined()
  },

  sessionEnd(entity) {
    entity.isOpen = false
  },

  // The pill goes down as the browser's dialog comes up. Dismissing the
  // dialog leaves the permission undecided, so the next sign-in asks again.
  // requestPermission runs within the tap that notified `ask`, which is what
  // the browser needs to show the dialog.
  ...handleAsync("ask", {
    start(entity) {
      entity.isOpen = false
    },
    run() {
      return Notification.requestPermission()
    },
    success(entity, permission, api) {
      if (permission === "granted") api.notify(`#${entity.id}:sync`)
    },
    error() {},
  }),

  decline(entity) {
    try {
      window.localStorage.setItem(PUSH_DECLINE_KEY, "true")
    } catch {
      // Without storage the pill comes back next sign-in, nothing worse.
    }
    entity.isOpen = false
  },

  // Nothing on screen depends on it: a browser that fails to sync now tries
  // again at the next sign-in.
  ...handleAsync("sync", {
    run() {
      return syncPushSubscription()
    },
    error() {},
  }),
}

function isDeclined() {
  try {
    return window.localStorage.getItem(PUSH_DECLINE_KEY) !== null
  } catch {
    return false
  }
}
