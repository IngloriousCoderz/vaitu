import { firebasePush } from "@inglorious/firebase/push"

import { PUSH_TOKEN_KEY } from "../constants/index.js"
import { supabase } from "./client.js"
import { firebaseConfig } from "./firebase.js"

export const push = firebasePush({
  firebase: firebaseConfig,
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
