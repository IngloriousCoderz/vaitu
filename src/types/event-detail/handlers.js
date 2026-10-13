import { handleAsync } from "@inglorious/store/async"
import { Form, getFieldValue } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { fetchEventDetail } from "../../api/events.js"
import { stopTick } from "../../ticker.js"

export function open(entity, event_id, api) {
  stopTick("clock")
  entity.motionVariant = null
  entity.event_id = event_id
  entity.event = null
  entity.senderName = null
  entity.status = "idle"
  entity.error = null
  entity.isSubmitted = false
  entity.applyStatus = "idle"
  entity.applyError = null
  Form.reset(entity)
  const profile = api.getEntity("profile").profile
  entity.values.full_name = profile?.full_name ?? ""
  entity.values.website = profile?.website ?? ""
  entity.values.instagram = profile?.instagram_handle ?? ""
  api.notify(`#${entity.id}:detailLoad`, event_id)
}

export function close(entity) {
  stopTick("clock")
  entity.event_id = null
  entity.event = null
  entity.senderName = null
  entity.status = "idle"
  entity.error = null
  entity.isSubmitted = false
  entity.applyError = null
  Form.reset(entity)
}

export function overlaysClose(entity) {
  close(entity)
}

export function fieldSet(entity, { field, value }) {
  Form.fieldChange(entity, { path: field, value })
}

export function clockTick(entity) {
  entity.nowTs = Date.now()
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
  const session = api.getEntity("session")
  if (!session?.user_id) {
    api.notify("#authentication:open")
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
    if (!user) throw new Error("Not logged in")
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
        throw new Error("You already applied for this event")
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
    entity.applyError = err.message ?? "Application failed"
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
    entity.motionVariant = "enter"
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load event"
  },
})
