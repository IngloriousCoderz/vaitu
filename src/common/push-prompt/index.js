import { isNative } from "@inglorious/web/mobile"

import { forgetCurrentPush, subscribeToPush } from "../../api/push.js"
import { PUSH_DECLINE_KEY } from "../../constants/index.js"
import { PushPromptBar as renderers } from "./template.js"

/* Layer 2's front door: the browser's own permission question, carried by the
   house's one-row pill rather than a surprise dialog at boot. The pill only
   rises when there is something undetermined to ask (permission is still
   "default" and the user has not already declined this session forever);
   "granted" is acted on silently — at every session start the endpoint is
   re-registered, so a revoked row or rotated keys heal on the next sign-in
   without any ceremony.

   The gestures run inside the store's dispatch (a click notifies, handlers
   run synchronously in that same click's task), which is exactly what
   requestPermission needs; the ask itself lives in the entity like
   PwaUpdate.refresh lives in its own. */

export const PushPrompt = {
  ...renderers,

  create(entity) {
    entity.isReady = false
    entity.isBusy = false
  },

  sessionStart(entity) {
    if (isNative()) return
    if (typeof window === "undefined") return
    if (!("Notification" in window)) return
    if (window.localStorage.getItem(PUSH_DECLINE_KEY)) return

    if (Notification.permission === "default") {
      entity.isReady = true
      return
    }
    if (Notification.permission === "granted") {
      entity.isReady = false
      // Silent sync: re-announce this browser under the session's user.
      // A failure is not a session failure — parked endpoints heal next
      // sign-in, and there is nothing on screen to hang an error on.
      subscribeToPush().catch(() => {})
    }
  },

  async ask(entity, payload, api) {
    if (entity.isBusy) return
    entity.isBusy = true
    try {
      // The gesture's promise is awaited, which is where the store commits
      // this handler's draft and revokes its proxy: everything decided here
      // re-enters as its own dispatch (the same way authentication's
      // handlers move the router after their awaits), never by writing
      // through the dead reference.
      const permission = await Notification.requestPermission()
      api.notify("#pushPrompt:settle", permission)
    } catch {
      // A torn-down dialog or a dead registration is still an answer:
      // settle to the same quiet end.
      api.notify("#pushPrompt:settle", "denied")
    }
  },

  // The ask's landing: the question is answered, the pill goes down, and a
  // grant turns into a subscription for the signed-in user. All synchronous,
  // dispatched on its own fresh entity.
  settle(entity, permission) {
    entity.isReady = false
    entity.isBusy = false
    if (permission !== "granted") return
    // A dead registration is not a question failure: parked endpoints heal
    // at the next session start, silently.
    subscribeToPush().catch(() => {})
  },

  // "Not now" means never ask on this device again: the flag is the decision,
  // surviving sessions. The permission state itself is still the browser's —
  // it can be re-granted from browser settings.
  decline(entity) {
    window.localStorage.setItem(PUSH_DECLINE_KEY, "1")
    entity.isReady = false
  },

  // Sign-out: the endpoint stops pointing at this app for a user who is no
  // longer here. The browser keeps the subscription itself — the next
  // session's silent sync claims the same endpoint under whoever signs in.
  async sessionEnd() {
    await forgetCurrentPush().catch(() => {})
  },
}
