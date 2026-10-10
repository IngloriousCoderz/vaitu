import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"
import { defaultTiers } from "./helpers.js"

export function open(entity, _, api) {
  entity.isOpen = true
  api.notify(`#${entity.id}:profileLoad`)
}

export function close(entity) {
  entity.isOpen = false
  entity.status = "idle"
  entity.error = null
  entity.isEditing = false
  entity.isMenuOpen = false
  entity.draft = null
}

export function overlaysClose(entity) {
  close(entity)
}

export function menuToggle(entity) {
  entity.isMenuOpen = !entity.isMenuOpen
}

export function menuClose(entity) {
  entity.isMenuOpen = false
}

export function editStart(entity, _, api) {
  entity.isEditing = true
  entity.isMenuOpen = false
  entity.draft = { ...entity.profile }
  entity.error = null
  api.notify("#country-profile:sync", entity.draft.country ?? "")
}

export function editCancel(entity) {
  entity.isEditing = false
  entity.draft = null
  entity.error = null
}

export function profileFieldSet(entity, { field, value }) {
  if (entity.draft) entity.draft[field] = value
}

export function favoriteInputSet(entity, value) {
  entity.favoriteInput = value ?? ""
}

export function favoriteAdd(entity, value) {
  if (!entity.draft) return
  const clean = (value ?? "").trim()
  if (!clean) return
  const current = entity.draft.favorite_regions ?? []
  if (current.includes(clean)) {
    entity.favoriteInput = ""
    return
  }
  entity.draft = { ...entity.draft, favorite_regions: [...current, clean] }
  entity.favoriteInput = ""
  entity.error = null
}

export function favoriteRemove(entity, value) {
  if (!entity.draft) return
  entity.draft = {
    ...entity.draft,
    favorite_regions: (entity.draft.favorite_regions ?? []).filter(
      (region) => region !== value,
    ),
  }
  entity.error = null
}

// Token valid but user row gone (db reset), or auth rejected the token.
// Network blips must NOT log out — only auth/row-gone errors.
function isSessionDead(err) {
  if (!err) return false
  if (err.code === "PGRST116") return true
  return /not logged in|jwt|expired|invalid.*token|user not found/i.test(
    err.message ?? "",
  )
}

export const profileLoad = handleAsync("profileLoad", {
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
      .select(
        "id, full_name, role, sub_role, country, region, website, instagram_handle, favorite_regions",
      )
      .eq("id", user.id)
      .single()
    if (error) throw error
    const { data: stats } = await supabase
      .from("seeker_stats")
      .select(
        "applications_count, shortlists_count, selections_count, points, tier",
      )
      .eq("applicant_id", user.id)
      .maybeSingle()
    const { data: config } = await supabase
      .from("app_config")
      .select("key, value")
    const byKey = Object.fromEntries(
      (config ?? []).map((row) => [row.key, row.value]),
    )
    const defaults = defaultTiers()
    return {
      profile: { ...profile, email: user.email },
      stats: stats ?? {
        applications_count: 0,
        shortlists_count: 0,
        selections_count: 0,
        points: 0,
        tier: null,
      },
      tiers: {
        bronzeMin: byKey.tier_bronze_min_points ?? defaults.bronzeMin,
        silverMin: byKey.tier_silver_min_points ?? defaults.silverMin,
        goldMin: byKey.tier_gold_min_points ?? defaults.goldMin,
        perApplication: byKey.points_per_application ?? defaults.perApplication,
        perShortlist: byKey.points_per_shortlist ?? defaults.perShortlist,
        perSelection: byKey.points_per_selection ?? defaults.perSelection,
      },
    }
  },
  success(entity, { profile, stats, tiers }, api) {
    entity.status = "ready"
    entity.profile = profile
    entity.stats = stats
    entity.tierConfig = tiers
    // Detail may have opened before the profile arrived — fill its blanks.
    api.notify("#detail:prefill", profile)
    if (profile.role === "sender") api.notify("#myEvents:eventsLoad")
  },
  error(entity, err, api) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load profile"
    if (isSessionDead(err)) api.notify("#session:sessionExpire")
  },
})

export const profileSave = handleAsync("profileSave", {
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
        favorite_regions: Array.isArray(profile.favorite_regions)
          ? [
              ...new Set(
                profile.favorite_regions.map((r) => r.trim()).filter(Boolean),
              ),
            ]
          : [],
      })
      .eq("id", user.id)
    if (error) throw error
    return profile
  },
  success(entity, profile, api) {
    entity.status = "ready"
    entity.profile = profile
    entity.draft = null
    entity.isEditing = false
    api.notify("#eventList:eventsLoad")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to save profile"
  },
})

export const logout = handleAsync("logout", {
  async run() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  },
  success(entity, _, api) {
    entity.isOpen = false
    entity.profile = null
    entity.status = "idle"
    api.notify("#eventDetail:close")
    api.notify("#authentication:open")
  },
  error(entity, err) {
    entity.error = err.message ?? "Logout failed"
  },
})
