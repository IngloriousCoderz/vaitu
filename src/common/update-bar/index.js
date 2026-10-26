import { TAKEOVER_TIMEOUT_MS } from "../../constants/index.js"
import * as renderers from "./template.js"

// A new version is fully downloaded behind the current session: the type only
// holds the flag — who sets it is the update check in `src/pwa.js`, and the
// shell renders the pill when the flag is up. There is no way to decline: the
// check applies the update on its own at the next trip to the background, so
// the pill only offers to do it now. The reload only lands on the new version
// after the waiting worker has taken over, so refresh first sends the
// SKIP_WAITING message the generated worker listens for, and reloads once it
// activates — not before, or the page just reopens on the old one.
export const PwaUpdate = {
  ...renderers,

  create(entity) {
    entity.isUpdateReady = false
  },

  ready(entity) {
    entity.isUpdateReady = true
  },

  async refresh() {
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
