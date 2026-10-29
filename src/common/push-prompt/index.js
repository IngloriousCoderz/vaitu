import { handleAsync } from "@inglorious/store/async"

import {
  isPushSupported,
  pushPermission,
  requestPushPermission,
  syncPushToken,
} from "../../api/push.js"
import { PUSH_DECLINE_KEY } from "../../constants/index.js"
import { PushPromptBar as renderers } from "./template.js"

// Asks for the permission pushes need, in a pill rather than the system's
// dialog straight away: the dialog only comes up once the user says yes, and
// a device that saw it refused may never show it again. "Not now" stops the
// pill on this device for good; the system's own settings can still allow
// notifications later. The same pill serves browsers and the native apps.
//
// Once allowed, every sign-in files this device's token under whoever signed
// in. Signing out removes it (see endSession in src/api/session.js).
export const PushPrompt = {
  ...renderers,

  create(entity) {
    entity.isOpen = false
    entity.isSignedIn = false
  },

  sessionStart(entity, _, api) {
    entity.isSignedIn = true
    api.notify(`#${entity.id}:check`)
  },

  sessionEnd(entity) {
    entity.isSignedIn = false
    entity.isOpen = false
  },

  // Asking the device is async, so a sign-out can land before the answer: the
  // pill only opens for someone still signed in.
  ...handleAsync("check", {
    async run() {
      if (!(await isPushSupported())) return null
      return pushPermission()
    },
    success(entity, permission, api) {
      if (!entity.isSignedIn) return
      if (permission === "granted") {
        api.notify(`#${entity.id}:sync`)
        return
      }
      entity.isOpen = permission === "prompt" && !isDeclined()
    },
    error() {},
  }),

  // The pill goes down as the system's dialog comes up. Dismissing the
  // dialog leaves the permission undecided, so the next sign-in asks again.
  // requestPushPermission runs within the tap that notified `ask`, which is
  // what a browser needs to show the dialog.
  ...handleAsync("ask", {
    start(entity) {
      entity.isOpen = false
    },
    run() {
      return requestPushPermission()
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

  // Nothing on screen depends on it: a device that fails to sync now tries
  // again at the next sign-in.
  ...handleAsync("sync", {
    run() {
      return syncPushToken()
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
