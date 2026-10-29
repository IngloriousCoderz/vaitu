// The whole UI package first, then our styles: at equal specificity the later
// rule wins, so this order is what lets the app override the package.
import "@inglorious/ui/all.css"
import "./pwa"
import "./native-update"
import "./styles/theme.css"
import "./styles/tokens.css"
import "./styles/list-stagger.css"

import { mount } from "@inglorious/web"

import { supabase } from "./api/client.js"
import { onPushTap } from "./api/push.js"
import { clearUser, endSession, stampLogin, writeUser } from "./api/session.js"
import { App } from "./app"
import { ready } from "./i18n/index.js"
import { store } from "./store"
import { isPreLoginPath, signInTarget } from "./store/guards.js"

// After the starting language has loaded, so the first render is in it.
ready.then(() => {
  mount(store, (api) => App.render(null, api), document.getElementById("root"))
  // The HTML boot mark only covers the cold start; once the tree is up it
  // would sit forever over the page.
  document.getElementById("boot-splash")?.remove()
})

store.notify("#eventList:load")

// A push tapped in the native apps opens its screen, as the service worker
// does in a browser. The route guard still stands between it and a visitor
// who signed out since.
onPushTap((url) => store.notify("#router:navigate", url))

function trackSession(session) {
  if (session) {
    writeUser(session.user)
    // Coming back is not an undo (deactivating deleted what they had sent and
    // their open events), so the sign-in that reactivates says so.
    stampLogin().then((isReactivated) => {
      if (isReactivated) store.notify("#shell:reactivatedShow")
    })
    // Whatever depends on who is signed in hears it here and reacts on its
    // own: the market, the profile and the bell each load (see their
    // `sessionStart`), so nothing waits for the page that needs it.
    store.notify("sessionStart")
    return
  }
  // Supabase owns the tokens; this drops our record of who they belonged to.
  clearUser()
  // Everything holding the leaving user's data lets go of it (see each
  // type's `sessionEnd`).
  store.notify("sessionEnd")

  // The guard only answers route changes, and a session ending is not one, so
  // without this the visitor is left sitting on a page they can no longer see —
  // which, on the profile, renders as a null profile and a crash.
  // window.location rather than the router entity: the store is wrapped by the
  // devtools middleware and does not forward getEntity, and the browser's own
  // view of where we are is never stale anyway.
  const { pathname, search } = window.location
  if (!isPreLoginPath(pathname)) {
    store.notify("#router:navigate", signInTarget(pathname + search))
  }
}

// Server-validated boot: a restart/reset can leave a stale local token behind.
// getUser() asks the server rather than trusting what is in storage, so a token
// that no longer works ends the session instead of stranding the visitor on a
// page that will start failing every request.
supabase.auth
  .getUser()
  .then(({ data, error }) => {
    if (error) return endSession()
    trackSession(data.user ? { user: data.user } : null)
  })
  .catch(() => endSession())

supabase.auth.onAuthStateChange((_event, session) => trackSession(session))
