import { supabase } from "./api/client.js"
import { store } from "./store/index.js"

// One channel per key, owned by the entity: activateRealtime() from create(),
// deactivateRealtime() from destroy(). The callback reads the store when a
// change arrives — a filter captured at subscribe time goes stale, and the
// handler `api` is revoked after dispatch.
const channels = {}

function channelName(key) {
  return `vaitu-${key}`
}

export function realtimeColumn(change, column) {
  const value = change?.new?.[column] ?? change?.old?.[column]
  return value == null ? null : value
}

export function activateRealtime(key, { table, event, payload, match }) {
  deactivateRealtime(key)
  const channel = supabase.channel(channelName(key))
  channels[key] = channel
  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      (change) => {
        const state = store.getState()
        if (!state.session?.user_id) return
        if (match && !match(change, state)) return
        store.notify(
          event,
          typeof payload === "function" ? payload(state) : payload,
        )
      },
    )
    .subscribe()
}

export function deactivateRealtime(key) {
  const channel = channels[key]
  if (!channel) return
  delete channels[key]
  void supabase.removeChannel(channel)
}
