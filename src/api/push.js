import { Capacitor } from "@capacitor/core"
import { FirebaseMessaging } from "@capacitor-firebase/messaging"
import { initializeApp } from "firebase/app"

import { PUSH_TOKEN_KEY } from "../constants/index.js"
import { supabase } from "./client.js"

// Notifications, layer 2: pushes, through Firebase Cloud Messaging on every
// platform. The device holds an FCM token; the database holds it under the
// user signed in here, which is where push-notify looks it up. In a browser
// the pushes land in public/sw-push.js; in the native apps the system shows
// them and onPushTap hears the tap.
//
// `push` is the adapter createPushPrompt (@inglorious/web/push) asks and
// registers through; src/common/push-prompt/ is the type made from it.

const PLATFORM = Capacitor.getPlatform()
const IS_WEB = PLATFORM === "web"

// The public half of the Web Push key pair in the Firebase console.
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

let isFirebaseReady = false

// The native apps read the Firebase project from google-services.json and
// GoogleService-Info.plist. A browser needs it in JS, set before the plugin's
// first call, which is when the plugin loads its web half.
function messaging() {
  if (IS_WEB && !isFirebaseReady) {
    initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    })
    isFirebaseReady = true
  }
  return FirebaseMessaging
}

/** @returns {Promise<boolean>} */
async function isPushSupported() {
  const { isSupported } = await messaging().isSupported()
  return isSupported
}

/**
 * Whether this device may show pushes. "prompt" covers never asked and asked
 * but dismissed, which on Android also comes back as "prompt-with-rationale".
 * @returns {Promise<"granted" | "denied" | "prompt">}
 */
async function pushPermission() {
  const { receive } = await messaging().checkPermissions()
  return toPermission(receive)
}

/**
 * Brings up the system's permission dialog. In a browser it must run within a
 * tap, so Notification.requestPermission is called before anything awaits.
 * @returns {Promise<"granted" | "denied" | "prompt">}
 */
async function requestPushPermission() {
  if (IS_WEB) return toPermission(await Notification.requestPermission())
  const { receive } = await messaging().requestPermissions()
  return toPermission(receive)
}

function toPermission(state) {
  return state === "granted" || state === "denied" ? state : "prompt"
}

/**
 * Gets this device's token, the same one again unless FCM rotated it, and
 * files it under the signed-in user. Needs the permission granted.
 */
async function syncPushToken() {
  const options = IS_WEB
    ? {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.ready,
      }
    : {}
  const { token } = await messaging().getToken(options)
  await savePushToken(token, PLATFORM)
  try {
    window.localStorage.setItem(PUSH_TOKEN_KEY, token)
  } catch {
    // Without storage the sign-out cannot delete the row; the next sign-in
    // here takes the token over.
  }
}

export const push = {
  isSupported: isPushSupported,
  permission: pushPermission,
  request: requestPushPermission,
  register: syncPushToken,
  onTap: onPushTap,
}

/**
 * Stops this device receiving the signed-in user's pushes. Must run before
 * the sign-out: the row can only be deleted with the user's own token. The
 * token comes from storage rather than FCM, which would mint one on a device
 * that never had any.
 */
export async function forgetPushToken() {
  let token
  try {
    token = window.localStorage.getItem(PUSH_TOKEN_KEY)
  } catch {
    return
  }
  if (!token) return
  await deletePushToken(token)
  window.localStorage.removeItem(PUSH_TOKEN_KEY)
}

/**
 * Calls back with a push's destination when it is tapped in the native apps.
 * A browser's taps are the service worker's.
 * @param {(url: string) => void} listener
 */
function onPushTap(listener) {
  if (IS_WEB) return
  messaging().addListener("notificationActionPerformed", ({ notification }) => {
    const url = notification.data?.url
    if (url) listener(url)
  })
}

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
