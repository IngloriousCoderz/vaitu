import "@inglorious/ui/all.css"
import "./pwa"
import "./native-update"
import "./styles/theme.css"
import "./styles/tokens.css"
import "./styles/list-stagger.css"

import { mount } from "@inglorious/web"

import { supabase } from "./api/client.js"
import { clearUser, endSession, stampLogin, writeUser } from "./api/session.js"
import { App } from "./app"
import { ready } from "./i18n/index.js"
import { store } from "./store"
import { isPreLoginPath, signInTarget } from "./store/guards.js"

ready.then(() => {
  mount(store, (api) => App.render(null, api), document.getElementById("root"))
  document.getElementById("boot-splash")?.remove()
})

store.notify("#eventList:load")

function trackSession(session) {
  if (session) {
    writeUser(session.user)
    stampLogin().then((isReactivated) => {
      if (isReactivated) store.notify("#shell:reactivatedShow")
    })
    store.notify("sessionStart")
    return
  }
  clearUser()
  store.notify("sessionEnd")

  // A session ending is not a route change, so the guard alone would leave the
  // visitor on a page they can no longer see. window.location, not the router
  // entity: the devtools middleware does not forward getEntity.
  const { pathname, search } = window.location
  if (!isPreLoginPath(pathname)) {
    store.notify("#router:navigate", signInTarget(pathname + search))
  }
}

// Asks the server: a reset backend leaves a stale token in storage.
supabase.auth
  .getUser()
  .then(({ data, error }) => {
    if (error) return endSession()
    trackSession(data.user ? { user: data.user } : null)
  })
  .catch(() => endSession())

supabase.auth.onAuthStateChange((_event, session) => trackSession(session))
