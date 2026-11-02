import { handleAsync } from "@inglorious/store/async"
import { cropImage } from "@inglorious/ui/image-cropper"
import { Form } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { errorKey } from "../../api/errors.js"
import {
  deleteAvatar,
  deleteImage,
  imageExtension,
  imageRefFromUrl,
  uploadAvatar,
} from "../../api/images.js"
import { fetchProfileStats } from "../../api/reputation.js"
import { endSession, setOnboardingDue } from "../../api/session.js"
import { createImageFile } from "../../common/image.js"
import { tiersFromConfig } from "../../common/tiers.js"
import { AVATAR_MAX_BYTES, AVATAR_SIZE } from "../../constants/index.js"
import { paths } from "../../routes.js"
import { AVATAR_CROPPER } from "./avatar-cropper.js"

/** @type {File | null} */
let avatarFile = null

export function editStart(entity, _, api) {
  entity.isEditing = true
  entity.initialValues = {
    full_name: entity.profile?.full_name ?? "",
    website: entity.profile?.website ?? "",
    phone: entity.profile?.phone ?? "",
    country: entity.profile?.country ?? "",
  }
  Form.reset(entity)
  entity.error = null
  api.notify("#countryProfile:valueSet", entity.values.country ?? "")
}

export function editCancel(entity) {
  entity.isEditing = false
  entity.error = null
}

export function fieldSet(entity, { field, value }) {
  if (!entity.isEditing) return
  Form.fieldChange(entity, { path: field, value })
}

export const load = handleAsync("load", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("errors.notLoggedIn")
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, country, website, phone, locale, avatar_url, onboarded_at",
      )
      .eq("id", user.id)
      .single()
    if (error) throw error
    const stats = (await fetchProfileStats([user.id]))[user.id]
    const { data: config } = await supabase
      .from("app_config")
      .select("key, value")
    return {
      profile: { ...profile, email: user.email },
      stats: stats ?? {
        applications_count: 0,
        shortlists_count: 0,
        selections_count: 0,
        points: 0,
        tier: null,
        badges: [],
      },
      tiers: tiersFromConfig(config),
    }
  },
  success(entity, { profile, stats, tiers }, api) {
    entity.status = "ready"
    entity.profile = profile
    entity.stats = stats
    entity.tierConfig = tiers
    api.notify("#eventDetail:prefill", profile)
    api.notify("#i18n:userLocaleLoad", {
      userId: profile.id,
      locale: profile.locale,
    })

    if (!profile.onboarded_at) {
      setOnboardingDue(true)
      if (api.getEntity("router").route !== "onboarding") {
        api.notify("#router:navigate", { to: paths.onboarding, replace: true })
      }
    }
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.loadProfile")
    if (isSessionDead(err)) void endSession()
  },
})

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run(profile) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("errors.notLoggedIn")
    const website = (profile.website ?? "").trim().toLowerCase()
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
        phone: (profile.phone ?? "").trim(),
        country: (profile.country ?? "").trim(),
      })
      .eq("id", user.id)
    if (error) throw error
    return profile
  },
  success(entity, profile) {
    entity.status = "ready"
    entity.profile = { ...entity.profile, ...profile }
    entity.isEditing = false
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.saveProfile")
  },
})

export function avatarCropOpen(entity, file, api) {
  entity.avatarError = null
  if (!imageExtension(file?.type)) {
    entity.avatarError = "errors.imageType"
    return
  }
  if (file.size > AVATAR_MAX_BYTES) {
    entity.avatarError = "errors.avatarSize"
    return
  }
  revokeAvatarPreview(entity)
  avatarFile = file
  entity.avatarPreviewUrl = URL.createObjectURL(file)
  entity.isAvatarCropOpen = true
  api.notify(`#${AVATAR_CROPPER}:srcChange`, entity.avatarPreviewUrl)
}

export function avatarCropCancel(entity) {
  if (entity.avatarStatus === "saving") return
  closeAvatarCrop(entity)
  entity.avatarError = null
}

export function closeAvatarCrop(entity) {
  revokeAvatarPreview(entity)
  avatarFile = null
  entity.avatarPreviewUrl = null
  entity.isAvatarCropOpen = false
}

export const avatarSave = handleAsync("avatarSave", {
  start(entity) {
    entity.avatarStatus = "saving"
    entity.avatarError = null
  },
  async run({ rect }) {
    const file = avatarFile
    if (!file || !rect) throw new Error("errors.imageCrop")
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("errors.notLoggedIn")

    let blob
    try {
      blob = await cropImage(file, rect, {
        aspectRatio: 1,
        maxWidth: AVATAR_SIZE,
        maxHeight: AVATAR_SIZE,
      })
    } catch {
      throw new Error("errors.imageCrop")
    }

    const uploaded = await uploadAvatar(createImageFile(blob, "avatar.jpg"))
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: uploaded.url })
      .eq("id", user.id)
    if (error) {
      await deleteAvatar(uploaded.path).catch(() => {})
      throw error
    }
    return uploaded
  },
  success(entity, uploaded) {
    entity.avatarStatus = "idle"
    closeAvatarCrop(entity)
    const previous = imageRefFromUrl(entity.profile?.avatar_url)
    entity.profile = { ...entity.profile, avatar_url: uploaded.url }
    if (
      previous &&
      !(previous.bucket === uploaded.bucket && previous.path === uploaded.path)
    ) {
      void deleteImage(previous.path, previous.bucket).catch(() => {})
    }
  },
  error(entity, err) {
    entity.avatarStatus = "idle"
    entity.avatarError = errorKey(err, "errors.saveProfile")
  },
})

export function accountDeactivateAsk(entity) {
  entity.isConfirmingDeactivate = true
  entity.deactivateError = null
}

export function accountDeactivateCancel(entity) {
  entity.isConfirmingDeactivate = false
  entity.deactivateError = null
}

export const accountDeactivate = handleAsync("accountDeactivate", {
  start(entity) {
    entity.deactivateStatus = "deactivating"
    entity.deactivateError = null
  },
  async run() {
    const { error } = await supabase.functions.invoke("deactivate-account")
    if (error) throw error
    await endSession()
    return true
  },
  success(entity) {
    entity.deactivateStatus = "idle"
    entity.isConfirmingDeactivate = false
    entity.profile = null
  },
  error(entity) {
    entity.deactivateStatus = "idle"
    entity.deactivateError = "errors.deactivateAccount"
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

export const accountDelete = handleAsync("accountDelete", {
  start(entity) {
    entity.deleteStatus = "deleting"
    entity.deleteError = null
  },
  async run() {
    const { error } = await supabase.functions.invoke("erase-account", {
      body: {},
    })
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
    entity.deleteError = "errors.eraseAccount"
  },
})

export const logout = handleAsync("logout", {
  async run() {
    await endSession()
    return true
  },
  success(entity) {
    entity.profile = null
    entity.status = "idle"
  },
  error(entity, err) {
    entity.error = errorKey(err, "errors.logout")
  },
})

// Only a rejected token or a missing row logs out, never a network blip.
function isSessionDead(err) {
  if (!err) return false
  if (err.code === "PGRST116") return true
  return /not logged in|jwt|expired|invalid.*token|user not found/i.test(
    err.message ?? "",
  )
}

function revokeAvatarPreview(entity) {
  if (entity.avatarPreviewUrl) URL.revokeObjectURL(entity.avatarPreviewUrl)
}
