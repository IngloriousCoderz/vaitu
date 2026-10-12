import { supabase } from "./api/client.js"
import { store } from "./store/index.js"

// Realtime subscriptions owned by page lifecycle (open/close), not render.
// Callbacks use store.notify directly: handler-time `api` objects are
// revoked after dispatch, so they cannot notify from deferred callbacks.
const channels = {}

function channelName(key) {
  return `vaitu-${key}`
}

export function registerRealtime(key, { table, filter, event, payload }) {
  if (channels[key]) return
  channels[key] = supabase
    .channel(channelName(key))
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      },
      () => store.notify(event, payload),
    )
    .subscribe()
}

export function unregisterRealtime(key) {
  if (!channels[key]) return
  void supabase.removeChannel(channels[key])
  delete channels[key]
}

export function clearRealtime() {
  for (const key of Object.keys(channels)) unregisterRealtime(key)
}
