import { Preferences } from "@capacitor/preferences"
import { NativeBiometric } from "@capgo/capacitor-native-biometric"
import {
  createNativeStorage,
  createSecureStorage,
} from "@inglorious/web/device/storage"

/**
 * Where the app keeps what outlives a visit: Capacitor Preferences in the
 * native app, which the system doesn't clear with the WebView's data, and
 * localStorage in a browser.
 */
export const preferences = createNativeStorage({ plugin: Preferences })

/** Where the session's tokens are kept: the Keychain or Keystore in the app. */
export const secrets = createSecureStorage({ plugin: NativeBiometric })
