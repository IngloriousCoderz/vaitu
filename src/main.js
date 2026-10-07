import "@inglorious/ui/tokens.css"
import "@inglorious/ui/themes/material.css"
import "@inglorious/ui/button.css"
import "@inglorious/ui/input.css"
import "@inglorious/ui/chip.css"
import "@inglorious/ui/badge.css"
import "@inglorious/ui/avatar.css"
import "@inglorious/ui/bottom-navigation.css"
import "@inglorious/ui/icon-button.css"
import "@inglorious/ui/select.css"
import "@inglorious/ui/combobox.css"
import "./pwa"
import "./theme/tokens.css"
import "./page-transitions.css"

import { mount } from "@inglorious/web"

import { supabase } from "./api/client.js"
import { App } from "./app"
import { store } from "./store"

mount(store, (api) => App.render(null, api), document.getElementById("root"))

store.notify("#events:eventsLoad")

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

// Server-validated boot: a restart/reset can leave a stale local token behind.
// getSession() trusts localStorage; getUser() asks the server.
supabase.auth
  .getUser()
  .then(({ data }) => trackSession(data.user ? { user: data.user } : null))
  .catch(() => trackSession(null))

supabase.auth.onAuthStateChange((_event, session) => trackSession(session))
