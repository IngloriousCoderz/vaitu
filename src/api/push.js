import { BASE64_BLOCK_SIZE } from "../constants/index.js"
import { supabase } from "./client.js"

/* Layer 2's backend contract: one endpoint row per (user, browser). The row
   holds the PushSubscription JSON (endpoint + p256dh + auth) so the edge
   function can iterate and send. No device tokens here — that is Layer 3
   (FCM/APNs via Capacitor), next card. */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// The browser's PushSubscription -> the columns the edge function reads.
function subscriptionToRow(sub) {
  const keys = sub.toJSON().keys
  return {
    endpoint: sub.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  }
}

// Subscribe (or re-subscribe) the current browser for the signed-in user.
// Called silently on every sessionStart when permission is already granted,
// and explicitly after the user grants in the pill.
export async function subscribeToPush() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  const { error } = await supabase.from("push_subscriptions").upsert({
    ...subscriptionToRow(sub),
    user_id: (await supabase.auth.getUser()).data.user?.id,
  })
  if (error) throw error
}

// Delete the endpoint row for the current browser (sign-out, or revoked).
// The browser keeps the PushSubscription itself; the next session's silent
// sync will re-create the row under whoever signs in next.
export async function forgetCurrentPush() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", sub.endpoint)
  if (error) throw error
}

// VAPID public key is a URL-safe base64 string; the Web Push API wants a
// Uint8Array. Standard unpadded decode.
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat(
    (BASE64_BLOCK_SIZE - (base64String.length % BASE64_BLOCK_SIZE)) %
      BASE64_BLOCK_SIZE,
  )
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
