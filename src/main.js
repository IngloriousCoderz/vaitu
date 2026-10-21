// Order matters: tokens define the primitives, the theme layer maps them onto
// semantic names, and only then do the components consume those names.
import "@inglorious/ui/tokens.css"
import "@inglorious/ui/safe-area.css"
import "@inglorious/ui/alert.css"
import "@inglorious/ui/app-bar.css"
import "@inglorious/ui/avatar.css"
import "@inglorious/ui/badge.css"
import "@inglorious/ui/bottom-navigation.css"
import "@inglorious/ui/button.css"
import "@inglorious/ui/button-group.css"
import "@inglorious/ui/card.css"
import "@inglorious/ui/chip.css"
import "@inglorious/ui/combobox.css"
import "@inglorious/ui/container.css"
import "@inglorious/ui/dialog.css"
import "@inglorious/ui/backdrop.css"
import "@inglorious/ui/drawer.css"
import "@inglorious/ui/fab.css"
import "@inglorious/ui/list.css"
import "@inglorious/ui/flex.css"
import "@inglorious/ui/icon.css"
import "@inglorious/ui/icon-button.css"
import "@inglorious/ui/input.css"
import "@inglorious/ui/progress.css"
import "@inglorious/ui/select.css"
import "@inglorious/ui/slider.css"
import "@inglorious/ui/textarea.css"
import "@inglorious/ui/view-transitions.css"
import "./pwa"
import "./styles/theme.css"
import "./styles/tokens.css"
import "./styles/list-stagger.css"
import "./styles/filter-transition.css"

import { withTransitions } from "@inglorious/ui/view-transitions"
import { mount } from "@inglorious/web"

import { supabase } from "./api/client.js"
import { clearUser, endSession, stampLogin, writeUser } from "./api/session.js"
import { App } from "./app"
import { ready } from "./i18n/index.js"
import { store } from "./store"
import { isPreLoginPath, signInTarget } from "./store/guards.js"

// After the starting language has loaded, so the first render is in it.
// Navigations into and out of the pages with a back button slide in the
// direction travelled; switching between top-level pages stays instant.
ready.then(() =>
  mount(
    withTransitions(store, {
      routes: [
        "eventDetail",
        "eventCreate",
        "applicationsReceived",
        "applicationDetail",
        "ranks",
      ],
    }),
    (api) => App.render(null, api),
    document.getElementById("root"),
  ),
)

store.notify("#eventList:eventsLoad")

function trackSession(session) {
  if (session) {
    writeUser(session.user)
    stampLogin()
    // Market and profile both depend on who is signed in: the list is filtered by
    // own events and applied marks, and the profile fills in the tab bar. Both
    // load once here rather than waiting for the page that needs them.
    store.notify("#eventList:eventsLoad")
    store.notify("#profile:profileLoad")
    return
  }
  // Supabase owns the tokens; this drops our record of who they belonged to.
  clearUser()
  store.notify("#i18n:userLocaleClear")
  store.notify("#shell:closeDrawer")

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
