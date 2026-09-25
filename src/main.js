import { mount } from "@inglorious/web"
import "./pwa"

import { App } from "./app"
import { store } from "./store"

mount(store, (api) => App.render(null, api), document.getElementById("root"))
