import "@inglorious/ui/all.css"
import "./pwa"
import "./native-update"
import "./live-update"
import "./app-links"
import "./back-button"
import "./keyboard"
import "./system-bars"
import "./styles/theme.css"
import "./styles/tokens.css"
import "./styles/list-stagger.css"

import { isNetworkError } from "@inglorious/supabase"
import { mount } from "@inglorious/web"

import { supabase } from "./api/client.js"
import { endSession, stampLogin } from "./api/session.js"
import { App } from "./app"
import { sessionRestored, sessionUser } from "./common/session/index.js"
import { ready } from "./i18n/index.js"
import { paths } from "./routes.js"
import { store } from "./store"
import {
  isPreLoginPath,
  landingForSession,
  signInTarget,
} from "./store/guards.js"

// The guard runs on the first route at mount, so it needs the session first.
Promise.all([ready, sessionRestored(store)]).then(() => {
  mount(store, (api) => App.render(null, api), document.getElementById("root"))
  document.getElementById("boot-splash")?.remove()
})

store.notify("#jobList:load")

function trackSession(session) {
  if (session) {
    store.notify("sessionChange", { user: sessionUser(session.user) })
    stampLogin().then((isReactivated) => {
      if (isReactivated) store.notify("#shell:reactivatedShow")
    })
    store.notify("sessionStart")
    return
  }
  store.notify("sessionChange", { user: null })
  store.notify("sessionEnd")

  // A session ending is not a route change, so the guard alone would leave the
  // visitor on a page they can no longer see. window.location, not the router
  // entity: the devtools middleware does not forward getEntity.
  const { pathname, search } = window.location
  if (!isPreLoginPath(pathname)) {
    store.notify("#router:navigate", signInTarget(pathname + search))
  }
}

// Asks the server: a reset backend leaves a stale token in storage. Offline,
// the stored session stands until the server can say otherwise.
supabase.auth
  .getUser()
  .then(({ data, error }) => {
    if (error) return isNetworkError(error) ? undefined : endSession()
    trackSession(data.user ? { user: data.user } : null)
    // Signed in without the app knowing, as when the stored user was cleared:
    // the sign-in page has nothing to offer.
    if (data.user && window.location.pathname === paths.login) {
      const query = Object.fromEntries(
        new URLSearchParams(window.location.search),
      )
      store.notify("#router:navigate", {
        to: landingForSession({ query }),
        replace: true,
      })
    }
  })
  .catch((error) => {
    if (!isNetworkError(error)) endSession()
  })

supabase.auth.onAuthStateChange((_event, session) => trackSession(session))
