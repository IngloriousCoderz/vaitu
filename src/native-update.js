import { App } from "@capacitor/app"
import { watchNativeUpdate } from "@inglorious/web/native/update"

import { store } from "./store"

watchNativeUpdate(App, store)
