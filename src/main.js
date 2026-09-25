import { mount } from "@inglorious/web"
import "./pwa"
import "./theme/tokens.css"

import { App } from "./app"
import { store } from "./store"

mount(store, (api) => App.render(null, api), document.getElementById("root"))

store.notify("#market:loadEvents")
