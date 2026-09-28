import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"

export function open(entity, _, api) {
  entity.open = true
  api.notify(`#${entity.id}:loadProfile`)
}

export function close(entity) {
  entity.open = false
  entity.status = "idle"
  entity.error = null
}

export const loadProfile = handleAsync("loadProfile", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not logged in")
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, role, sub_role, country, region")
      .eq("id", user.id)
      .single()
    if (error) throw error
    return { ...profile, email: user.email }
  },
  success(entity, profile) {
    entity.status = "ready"
    entity.profile = profile
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load profile"
  },
})

export const logout = handleAsync("logout", {
  async run() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  },
  success(entity, _, api) {
    entity.open = false
    entity.profile = null
    entity.status = "idle"
    api.notify("#detail:close")
    api.notify("#auth:open")
  },
  error(entity, err) {
    entity.error = err.message ?? "Logout failed"
  },
})
