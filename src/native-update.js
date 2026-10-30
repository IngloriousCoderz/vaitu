import { App } from "@capacitor/app"
import { isNative } from "@inglorious/web/mobile"

import { store } from "./store"

if (isNative()) {
  store.notify("#appVersion:check")
  App.addListener("resume", () => store.notify("#appVersion:check"))
}
