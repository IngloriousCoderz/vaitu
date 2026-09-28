export const Session = {
  setSession(entity, { user_id, email }, api) {
    entity.user_id = user_id
    entity.email = email
    entity.status = "ready"
    // Preload the profile so the tab bar can show initials. Guarded to avoid
    // refetching on every token refresh.
    if (!api.getEntity("profile").profile) {
      api.notify("#profile:loadProfile")
    }
  },
  clearSession(entity, _, api) {
    entity.user_id = null
    entity.email = null
    entity.status = "ready"
    api.notify("#profile:close")
  },
}
