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
import "./pwa"
import "./theme/tokens.css"

import { mount } from "@inglorious/web"

import { supabase } from "./api/client.js"
import { App } from "./app"
import { store } from "./store"

mount(store, (api) => App.render(null, api), document.getElementById("root"))

store.notify("#events:loadEvents")

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
