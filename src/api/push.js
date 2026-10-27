import { supabase } from "./client.js"

// Notifications, layer 2: Web Push. The browser holds the subscription; the
// database holds its endpoint and keys under the user signed in here, which
// is where push-notify looks them up. The service worker that receives the
// pushes is public/sw-push.js.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  )
}

/**
 * Subscribes this browser, or reuses the subscription it already has, and
 * files it under the signed-in user. Needs the permission granted.
 */
export async function syncPushSubscription() {
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY,
    }))
  await savePushSubscription(subscription.toJSON())
}

/**
 * Stops this browser receiving the signed-in user's pushes. Must run before
 * the sign-out: the row can only be deleted with the user's own token.
 */
export async function forgetPushSubscription() {
  if (!isPushSupported()) return
  // Not `ready`, which never settles where no worker was registered (dev).
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) await deletePushSubscription(subscription.endpoint)
}

/**
 * @param {{endpoint: string, keys: {p256dh: string, auth: string}}} subscription
 *   A PushSubscription as JSON.
 */
export async function savePushSubscription({ endpoint, keys }) {
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
  })
  if (error) throw error
}

/** @param {string} endpoint */
export async function deletePushSubscription(endpoint) {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
  if (error) throw error
}
