import { mount } from "@inglorious/web"
import "./pwa"
import "./theme/tokens.css"

import { supabase } from "./api/client.js"
import { App } from "./app"
import { store } from "./store"

mount(store, (api) => App.render(null, api), document.getElementById("root"))

store.notify("#market:loadEvents")

function trackSession(session) {
  if (session) {
    store.notify("#session:setSession", {
      user_id: session.user.id,
      email: session.user.email,
    })
  } else {
    store.notify("#session:clearSession")
  }
}

supabase.auth.getSession().then(({ data }) => trackSession(data.session))
supabase.auth.onAuthStateChange((_event, session) => trackSession(session))
