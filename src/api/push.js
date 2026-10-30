import { firebasePush } from "@inglorious/firebase/push"

import { PUSH_TOKEN_KEY } from "../constants/index.js"
import { supabase } from "./client.js"
import { firebaseConfig } from "./firebase.js"

// Notifications, layer 2: pushes, through Firebase Cloud Messaging on every
// platform. The device holds an FCM token; the database holds it under the
// user signed in here, which is where push-notify looks it up. In a browser
// the pushes land in public/sw-push.js; in the native apps the system shows
// them.
//
// `push` is the adapter createPushPrompt (@inglorious/web/push) asks and
// registers through; src/common/push-prompt/ is the type made from it.
// `push.unregister()` deletes this device's token, at sign-out.
export const push = firebasePush({
  firebase: firebaseConfig,
  // The public half of the Web Push key pair in the Firebase console.
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
  saveToken: savePushToken,
  deleteToken: deletePushToken,
  tokenKey: PUSH_TOKEN_KEY,
})

/**
 * @param {string} token An FCM registration token.
 * @param {"web" | "android" | "ios"} platform
 */
export async function savePushToken(token, platform) {
  const { error } = await supabase.rpc("save_push_token", {
    p_token: token,
    p_platform: platform,
  })
  if (error) throw error
}

/** @param {string} token */
export async function deletePushToken(token) {
  const { error } = await supabase
    .from("push_tokens")
    .delete()
    .eq("token", token)
  if (error) throw error
}
