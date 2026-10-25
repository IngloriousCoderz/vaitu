import { handleAsync } from "@inglorious/store/async"
import { Form, getFieldValue } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { fetchEventDetail } from "../../api/events.js"
import { readUserId } from "../../api/session.js"
import { startTick } from "../../api/ticker.js"
import {
  DAY_MS,
  FIRST_INDEX,
  MIN_PHOTOS_TO_NAVIGATE,
  NO_TIME_LEFT,
} from "../../constants/index.js"
import { paths } from "../../routes.js"

export function fieldSet(entity, { field, value }) {
  Form.fieldChange(entity, { path: field, value })
}

export function clockTick(entity) {
  entity.nowTs = Date.now()
}

export function photoOpen(entity, index) {
  entity.photoIndex = index ?? FIRST_INDEX
  entity.isPhotoPreviewOpen = true
}

export function photoClose(entity) {
  entity.isPhotoPreviewOpen = false
}

// Where a swipe on the enlarged photo began, so its end can tell which way it went.
export function photoSwipeStart(entity, x) {
  entity.photoSwipeX = x
}

export function photoStep(entity, delta) {
  if (!entity.isPhotoPreviewOpen) return
  const urls = entity.event?.imageUrls ?? []
  const n = urls.length
  if (n < MIN_PHOTOS_TO_NAVIGATE) return
  entity.photoIndex = ((entity.photoIndex ?? FIRST_INDEX) + delta + n) % n
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
    if (!user) throw new Error("errors.notLoggedIn")
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
        throw new Error("errors.alreadyApplied")
      }
      throw error
    }
    return true
  },
  success(entity, _, api) {
    entity.applyStatus = "ready"
    entity.isSubmitted = true
    api.notify("#eventList:load")
  },
  error(entity, err) {
    entity.applyStatus = "error"
    entity.applyError = err.message ?? "errors.applicationFailed"
  },
})

export const load = handleAsync("load", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run(event_id) {
    return fetchEventDetail(event_id)
  },
  success(entity, { event, senderName }, api) {
    entity.status = "ready"
    entity.event = event
    entity.senderName = senderName
    // The last day counts down by the minute.
    if (needsClock(event)) {
      const id = entity.id
      startTick("clock", () => api.notify(`#${id}:clockTick`))
    }
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "errors.loadEvent"
  },
})

function needsClock(event) {
  if (!event?.application_deadline) return false
  const msLeft = new Date(event.application_deadline).getTime() - Date.now()
  return msLeft > NO_TIME_LEFT && msLeft < DAY_MS
}
