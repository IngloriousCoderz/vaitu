import "@inglorious/ui/all.css"
import "./pwa"
import "./styles/theme.css"
import "./styles/tokens.css"
import "./styles/list-stagger.css"

import { mount } from "@inglorious/web"

import { App } from "./app"
import { sessionRestored } from "./common/session/index.js"
import { ready } from "./i18n/index.js"
import { store } from "./store"

// The guard runs on the first route at mount, so it needs the session first:
// the authentication entity reports it, and the session holds it.
Promise.all([ready, sessionRestored(store)]).then(() => {
  mount(store, (api) => App.render(null, api), document.getElementById("root"))
  document.getElementById("boot-splash")?.remove()
})

store.notify("#jobList:load")
