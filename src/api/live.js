import { realtimeSource } from "@inglorious/supabase"
import { withLiveReload } from "@inglorious/web/decorators/with-live-reload"

import { supabase } from "./client.js"
import { readUserId } from "./session.js"

// Live data: an entity reloads, through its own `load`, whenever a table it
// reads changes (withLiveReload, over Supabase Realtime). Which rows changed
// does not matter. src/store/index.js says who reads what.

const source = realtimeSource(supabase)

/**
 * A page: live while its route is open, which is when its `load` would run
 * anyway. Opening it again loads it fresh.
 * @param {string[]} tables
 * @param {(entity: object) => unknown} [payload] What its `load` takes.
 */
export function livePage(tables, payload) {
  return withLiveReload({
    source,
    tables,
    payload,
    isLive: (entity, api) =>
      readUserId() != null && api.getEntity("router")?.route === entity.id,
  })
}

/**
 * Live for as long as someone is signed in, open or not, like the bell.
 * @param {string[]} tables
 */
export function liveSession(tables) {
  return withLiveReload({ source, tables, isLive: () => readUserId() != null })
}

/**
 * Live always, signed in or not, like the public feed.
 * @param {string[]} tables
 */
export function liveAlways(tables) {
  return withLiveReload({ source, tables })
}
