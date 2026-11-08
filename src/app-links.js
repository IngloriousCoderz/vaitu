import { App } from "@capacitor/app"
import { watchAppLinks } from "@inglorious/web/app-links"

import { store } from "./store"

watchAppLinks(App, store)
