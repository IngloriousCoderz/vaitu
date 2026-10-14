import { handleAsync } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import {
  canonicalRegion,
  favoriteRegionOptions,
  regionAfterCountryChange,
  regionForCountry,
  sameRegion,
  uniqueRegions,
} from "../../data/regions/resolve.js"
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
  const country = entity.profile?.country ?? ""
  entity.initialValues = {
    full_name: entity.profile?.full_name ?? "",
    website: entity.profile?.website ?? "",
    instagram_handle: entity.profile?.instagram_handle ?? "",
    country,
    region: regionForCountry(country, entity.profile?.region ?? ""),
    favorite_regions: uniqueRegions(entity.profile?.favorite_regions ?? []),
  }
  Form.reset(entity)
  entity.error = null
  api.notify("#country-profile:sync", entity.values.country ?? "")
  api.notify("#region-profile:sync", entity.values.region ?? "")
  syncFavoriteCombobox(entity, api)
}

function syncFavoriteCombobox(entity, api) {
  if (!api) return
  const events = api.getEntity("eventList")?.events ?? []
  api.notify("#favorite-region-profile:sync", "")
  api.notify(
    "#favorite-region-profile:optionsSet",
    favoriteRegionOptions(
      events.map((event) => event.region),
      entity.values?.favorite_regions ?? [],
    ),
  )
}

export function editCancel(entity) {
  entity.isEditing = false
  entity.error = null
}

export function profileFieldSet(entity, { field, value }, api) {
  if (!entity.isEditing) return
  if (field === "country") {
    const previous = entity.values.country ?? ""
    const region = entity.values.region ?? ""
    Form.fieldChange(entity, { path: "country", value })
    Form.fieldChange(entity, {
      path: "region",
      value: regionAfterCountryChange(previous, value, region),
    })
    api?.notify("#region-profile:sync", entity.values.region ?? "")
    return
  }
  Form.fieldChange(entity, { path: field, value })
}

export function favoritesApply(entity, regions, api) {
  if (!entity.profile) return
  const favorite_regions = Array.isArray(regions) ? regions : []
  entity.profile = { ...entity.profile, favorite_regions }
  if (entity.isEditing) {
    Form.fieldChange(entity, {
      path: "favorite_regions",
      value: [...favorite_regions],
    })
  }
  syncFavoriteCombobox(entity, api)
}

export function favoriteInputSet(entity, value) {
  entity.favoriteInput = value ?? ""
}

export function favoriteAdd(entity, value, api) {
  if (!entity.isEditing) return
  const clean = canonicalRegion(value)
  if (!clean) return
  const current = entity.values.favorite_regions ?? []
  if (!current.some((region) => sameRegion(region, clean))) {
    Form.fieldChange(entity, {
      path: "favorite_regions",
      value: [...current, clean],
    })
  }
  entity.favoriteInput = ""
  entity.error = null
  syncFavoriteCombobox(entity, api)
}

export function favoriteChoiceSelect(entity, { value }, api) {
  favoriteAdd(entity, value, api)
}

export function favoriteRemove(entity, value, api) {
  if (!entity.isEditing) return
  Form.fieldChange(entity, {
    path: "favorite_regions",
    value: (entity.values.favorite_regions ?? []).filter(
      (region) => !sameRegion(region, value),
    ),
  })
  entity.error = null
  syncFavoriteCombobox(entity, api)
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
        "id, full_name, sub_role, country, region, website, instagram_handle, favorite_regions",
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
    api.notify("#eventDetail:prefill", profile)
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
    entity.profile = { ...entity.profile, ...profile }
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
