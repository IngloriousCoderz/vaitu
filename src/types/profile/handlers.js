import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"

export function open(entity, _, api) {
  entity.isOpen = true
  api.notify(`#${entity.id}:loadProfile`)
}

export function close(entity) {
  entity.isOpen = false
  entity.status = "idle"
  entity.error = null
  entity.isEditing = false
  entity.draft = null
}

export function startEdit(entity) {
  entity.isEditing = true
  entity.draft = { ...entity.profile }
  entity.error = null
}

export function cancelEdit(entity) {
  entity.isEditing = false
  entity.draft = null
  entity.error = null
}

export function setProfileField(entity, { field, value }) {
  if (entity.draft) entity.draft[field] = value
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
      .select("full_name, role, sub_role, country, region, website, instagram_handle")
      .eq("id", user.id)
      .single()
    if (error) throw error
    const { data: stats } = await supabase
      .from("seeker_stats")
      .select("applications_count, shortlists_count, selections_count")
      .eq("applicant_id", user.id)
      .maybeSingle()
    return {
      profile: { ...profile, email: user.email },
      stats: stats ?? {
        applications_count: 0,
        shortlists_count: 0,
        selections_count: 0,
      },
    }
  },
  success(entity, { profile, stats }, api) {
    entity.status = "ready"
    entity.profile = profile
    entity.stats = stats
    // Detail may have opened before the profile arrived — fill its blanks.
    api.notify("#detail:prefill", profile)
    if (profile.role === "sender") api.notify("#my_events:loadMyEvents")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load profile"
  },
})

export const saveProfile = handleAsync("saveProfile", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run(profile) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not logged in")
    const website = (profile.website ?? "").trim().toLowerCase()
    const instagram = (profile.instagram_handle ?? "")
      .trim()
      .toLowerCase()
      .replace(/^@+/, "")
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        website:
          website === ""
            ? ""
            : /^https?:\/\//i.test(website)
              ? website
              : `https://${website}`,
        instagram_handle: instagram === "" ? "" : `@${instagram}`,
        country: (profile.country ?? "").trim(),
        region: (profile.region ?? "").trim(),
      })
      .eq("id", user.id)
    if (error) throw error
    return profile
  },
  success(entity, profile) {
    entity.status = "ready"
    entity.profile = profile
    entity.draft = null
    entity.isEditing = false
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to save profile"
  },
})

export const logout = handleAsync("logout", {  async run() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  },
  success(entity, _, api) {
    entity.isOpen = false
    entity.profile = null
    entity.status = "idle"
    api.notify("#detail:close")
    api.notify("#auth:open")
  },
  error(entity, err) {
    entity.error = err.message ?? "Logout failed"
  },
})
