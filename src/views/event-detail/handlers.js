import { handleAsync } from "@inglorious/store/async"
import { Form, getFieldValue } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { fetchEventDetail } from "../../api/events.js"
import { readUserId } from "../../api/session.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"

export function fieldSet(entity, { field, value }) {
  Form.fieldChange(entity, { path: field, value })
}

export function clockTick(entity) {
  entity.nowTs = Date.now()
}

export function photoOpen(entity, index) {
  entity.photoIndex = index ?? 0
  entity.photoPreview = true
}

export function photoClose(entity) {
  entity.photoPreview = false
}

export function photoStep(entity, delta) {
  if (!entity.photoPreview) return
  const urls = entity.event?.imageUrls ?? []
  const n = urls.length
  if (n < 2) return
  entity.photoIndex = ((entity.photoIndex ?? 0) + delta + n) % n
}

// Fill blanks from the profile without clobbering what the user typed.
export function prefill(entity, profile) {
  if (!profile || !entity.values) return
  if (!getFieldValue(entity, "full_name", "")) {
    entity.values.full_name = profile.full_name ?? ""
  }
  if (!getFieldValue(entity, "website", "")) {
    entity.values.website = profile.website ?? ""
  }
  if (!getFieldValue(entity, "instagram", "")) {
    entity.values.instagram = profile.instagram_handle ?? ""
  }
}

// Requires a session, then runs the real insert via `apply`.
export function applicationSubmit(entity, _, api) {
  if (!readUserId()) {
    api.notify("#router:navigate", paths.login)
    return
  }
  api.notify(`#${entity.id}:apply`, {
    event_id: entity.event_id,
    full_name: entity.values.full_name,
    website: entity.values.website,
    instagram: entity.values.instagram,
    motivation: entity.values.motivation,
  })
}

export const apply = handleAsync("apply", {
  start(entity) {
    entity.applyStatus = "sending"
    entity.applyError = null
  },
  async run({ event_id, full_name, website, instagram, motivation }) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error(t("errors.notLoggedIn"))
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: full_name.trim(),
        website: website.trim().toLowerCase(),
        instagram_handle: instagram.trim().toLowerCase(),
      })
      .eq("id", user.id)
    if (profileError) throw profileError
    const { error } = await supabase.from("applications").insert({
      event_id,
      applicant_id: user.id,
      motivation: motivation.trim(),
    })
    if (error) {
      if (error.code === "23505") {
        throw new Error(t("errors.alreadyApplied"))
      }
      throw error
    }
    return true
  },
  success(entity, _, api) {
    entity.applyStatus = "ready"
    entity.isSubmitted = true
    api.notify("#eventList:eventsLoad")
  },
  error(entity, err) {
    entity.applyStatus = "error"
    entity.applyError = err.message ?? t("errors.applicationFailed")
  },
})

export const detailLoad = handleAsync("detailLoad", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run(event_id) {
    return fetchEventDetail(event_id)
  },
  success(entity, { event, senderName }) {
    entity.status = "ready"
    entity.event = event
    entity.senderName = senderName
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? t("errors.loadEvent")
  },
})
