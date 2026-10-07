import { handleAsync } from "@inglorious/store/async"

import { unsubscribeApplications } from "../../api/events.js"
import { supabase } from "../../api/client.js"

export const sessionExpire = handleAsync("sessionExpire", {
  async run() {
    await supabase.auth.signOut()
  },
  success(entity, _, api) {
    api.notify(`#${entity.id}:clearSession`)
    api.notify("overlaysClose")
  },
  error(entity, _, api) {
    api.notify(`#${entity.id}:clearSession`)
    api.notify("overlaysClose")
  },
})

export const Session = {
  setSession(entity, { user_id, email }, api) {
    const changed = entity.user_id !== user_id
    entity.user_id = user_id
    entity.email = email
    entity.status = "ready"
    // Preload the profile so the tab bar can show initials. Guarded to avoid
    // refetching on every token refresh.
    if (!api.getEntity("profile").profile) {
      api.notify("#profile:profileLoad")
    }
    // Market loads at boot before the session resolves (empty applied map);
    // reload whenever the user changes so applied marks are correct.
    if (changed) api.notify("#events:eventsLoad")
  },
  clearSession(entity, _, api) {
    unsubscribeApplications()
    entity.user_id = null
    entity.email = null
    entity.status = "ready"
    api.notify("#profile:close")
    api.notify("#events:appliedClear")
  },
  ...sessionExpire,
}
