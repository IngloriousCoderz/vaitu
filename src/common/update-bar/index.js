import { TAKEOVER_TIMEOUT_MS, UPDATE_DEFER_KEY } from "../../constants/index.js"
import * as renderers from "./template.js"

// An update is fully downloaded behind the current session: the type only
// holds the flag — who sets it is the update check in `src/pwa.js`, and the
// shell renders the pill when the flag is up. The X asks instead of refusing
// (there is nothing to refuse): the update will land on the next time the app
// opens anyway, so the dialog is really to pick when. "Next time" arms a
// one-shot deferral in localStorage, spent by the boot check — the reload only
// lands on the new version after the waiting worker has taken over, so both
// paths first send the SKIP_WAITING message the generated worker listens for,
// and reload once it activates — not before, or the page just reopens on the
// old one.
export const PwaUpdate = {
  ...renderers,

  create(entity) {
    entity.isUpdateReady = false
    entity.isDismissed = false
    entity.isDialogOpen = false
  },

  ready(entity) {
    entity.isDialogOpen = false
    entity.isUpdateReady = true
    entity.isDismissed = false
  },

  // The X on the pill: nothing is being declined, so it opens the dialog
  // asking whether to move over now or leave it to the next cold open.
  ask(entity) {
    entity.isDialogOpen = true
  },

  // Backdrop, Esc or the dialog's own ×: the pill stays, nothing armed.
  decline(entity) {
    entity.isDialogOpen = false
  },

  // "Next time": hide the pill and arm the boot check to reload once, the
  // moment the app opens over a waiting worker. One flag, one reload — spent
  // by the boot check in src/pwa.js so it can never loop.
  defer(entity) {
    window.localStorage.setItem(UPDATE_DEFER_KEY, "1")
    entity.isDialogOpen = false
    entity.isDismissed = true
  },

  async refresh(entity) {
    if (entity) entity.isDialogOpen = false
    const reload = () => window.location.reload()
    const registration = await navigator.serviceWorker?.getRegistration()
    const worker = registration?.waiting
    if (!worker?.postMessage) return reload()
    await new Promise((resolve) => {
      const done = setTimeout(resolve, TAKEOVER_TIMEOUT_MS)
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") {
          clearTimeout(done)
          resolve()
        }
      })
      worker.postMessage({ type: "SKIP_WAITING" })
    })
    reload()
  },
}
