import { supabase } from "./client.js"
import { readUserId } from "./session.js"

// create() calls activateRealtime() with its api, destroy() calls
// deactivateRealtime(). The api is the store's own, the same object every
// handler gets, so a change arriving long after create() can still notify.
// The Supabase client already keeps the open channels, under `realtime:` plus
// the name. A local map drops the handle when removeChannel fails, and the
// channel keeps running with nothing left that can close it.

export function realtimeColumn(change, column) {
  const value = change?.new?.[column] ?? change?.old?.[column]
  return value == null ? null : value
}

export function activateRealtime(key, { table, event, payload, match }, api) {
  deactivateRealtime(key)
  const channel = supabase.channel(channelName(key))
  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      (change) => {
        const state = api.getEntities()
        if (!readUserId()) return
        if (match && !match(change, state)) return
        api.notify(
          event,
          typeof payload === "function" ? payload(state) : payload,
        )
      },
    )
    .subscribe()
}

export function deactivateRealtime(key) {
  const channel = findChannel(key)
  if (!channel) return
  void supabase.removeChannel(channel)
}

function channelName(key) {
  return `vaitu-${key}`
}

function findChannel(key) {
  const topic = `realtime:${channelName(key)}`
  return supabase.getChannels().find((channel) => channel.topic === topic)
}
