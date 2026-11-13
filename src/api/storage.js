import { Preferences } from "@capacitor/preferences"
import { createNativeStorage } from "@inglorious/web/mobile"

/**
 * Where the app keeps what outlives a visit: Capacitor Preferences in the
 * native app, which the system doesn't clear with the WebView's data, and
 * localStorage in a browser.
 */
export const preferences = createNativeStorage({ plugin: Preferences })
