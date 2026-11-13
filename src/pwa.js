import { isNative } from "@inglorious/web/native"
import { watchPwaUpdate } from "@inglorious/web/pwa"
import { registerSW } from "virtual:pwa-register"

import { store } from "./store"

if (!isNative()) {
  registerSW({
    onRegisteredSW(url, registration) {
      if (registration) watchPwaUpdate(registration, store)
    },
  })
}
