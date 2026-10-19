import { handleAsync } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import {
  deleteUserImage,
  imageExtension,
  imagePathFromUrl,
  uploadUserImage,
} from "../../api/images.js"
import { endSession } from "../../api/session.js"
import { defaultTiers } from "../../common/tiers.js"
import { IMAGE_MAX_BYTES } from "../../constants/index.js"
import {
  canonicalRegion,
  favoriteRegionOptions,
  regionAfterCountryChange,
  regionForCountry,
  sameRegion,
  uniqueRegions,
} from "../../data/regions/resolve.js"
import { t } from "../../i18n/index.js"

export function editStart(entity, _, api) {
  entity.isEditing = true
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
    if (!user) throw new Error(t("errors.notLoggedIn"))
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, sub_role, country, region, website, instagram_handle, favorite_regions, locale, avatar_url",
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
    api.notify("#i18n:userLocaleLoad", {
      userId: profile.id,
      locale: profile.locale,
    })
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? t("errors.loadProfile")
    if (isSessionDead(err)) void endSession()
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
    if (!user) throw new Error(t("errors.notLoggedIn"))
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
    entity.error = err.message ?? t("errors.saveProfile")
  },
})

// Quietly: the language has already changed on screen, and a failed save only
// means another device keeps the old one until the next change.
export const avatarSave = handleAsync("avatarSave", {
  start(entity) {
    entity.avatarStatus = "saving"
    entity.avatarError = null
  },
  async run(file) {
    if (!imageExtension(file?.type)) throw new Error(t("errors.imageType"))
    if (file.size > IMAGE_MAX_BYTES) throw new Error(t("errors.imageSize"))
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error(t("errors.notLoggedIn"))
    const uploaded = await uploadUserImage(file)
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: uploaded.url })
      .eq("id", user.id)
    if (error) {
      await deleteUserImage(uploaded.path)
      throw error
    }
    return uploaded
  },
  success(entity, uploaded) {
    entity.avatarStatus = "idle"
    const previous = imagePathFromUrl(entity.profile?.avatar_url)
    entity.profile = { ...entity.profile, avatar_url: uploaded.url }
    if (previous && previous !== uploaded.path) {
      void deleteUserImage(previous)
    }
  },
  error(entity, err) {
    entity.avatarStatus = "idle"
    entity.avatarError = err.message ?? t("errors.saveProfile")
  },
})

export const localeSave = handleAsync("localeSave", {
  async run(locale) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const { error } = await supabase
      .from("profiles")
      .update({ locale })
      .eq("id", user.id)
    if (error) throw error
    return locale
  },
  success(entity, locale) {
    if (locale && entity.profile) entity.profile = { ...entity.profile, locale }
  },
  error(_, err) {
    console.warn("[profile] language not saved:", err)
  },
})

export function accountDeleteAsk(entity) {
  entity.isConfirmingDelete = true
  entity.deleteError = null
}

export function accountDeleteCancel(entity) {
  entity.isConfirmingDelete = false
  entity.deleteError = null
}

// The server deletes the account, the files and everything the database
// cascades from it. Ending the session afterwards is what moves the visitor to
// the sign-in screen: main.js answers it like any other sign-out.
export const accountDelete = handleAsync("accountDelete", {
  start(entity) {
    entity.deleteStatus = "deleting"
    entity.deleteError = null
  },
  async run() {
    const { error } = await supabase.functions.invoke("delete-account")
    if (error) throw error
    await endSession()
    return true
  },
  success(entity) {
    entity.deleteStatus = "idle"
    entity.isConfirmingDelete = false
    entity.profile = null
  },
  error(entity) {
    entity.deleteStatus = "idle"
    entity.deleteError = t("errors.deleteAccount")
  },
})

export const logout = handleAsync("logout", {
  async run() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  },
  success(entity) {
    entity.profile = null
    entity.status = "idle"
    // Clearing the session is enough — the guard moves the visitor to /login.
  },
  error(entity, err) {
    entity.error = err.message ?? t("errors.logout")
  },
})
