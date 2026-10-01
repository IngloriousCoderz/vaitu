import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"
import { fetchEventDetail } from "../../api/events.js"

export function open(entity, event_id, api) {
  entity.event_id = event_id
  entity.event = null
  entity.senderName = null
  entity.status = "idle"
  entity.error = null
  entity.isSubmitted = false
  entity.applyStatus = "idle"
  entity.applyError = null
  entity.motivation = ""
  // Prefill identity from the user's profile (source of truth).
  const profile = api.getEntity("profile").profile
  entity.full_name = profile?.full_name ?? ""
  entity.website = profile?.website ?? ""
  entity.instagram = profile?.instagram_handle ?? ""
  api.notify(`#${entity.id}:loadDetail`, event_id)
}

export function close(entity) {
  entity.event_id = null
  entity.event = null
  entity.senderName = null
  entity.status = "idle"
  entity.error = null
  entity.isSubmitted = false
}

export function closeOverlays(entity) {
  close(entity)
}

export function setField(entity, { field, value }) {
  entity[field] = value
}

// Fill blanks from the profile without clobbering what the user typed.
export function prefill(entity, profile) {
  if (!profile) return
  if (!entity.full_name) entity.full_name = profile.full_name ?? ""
  if (!entity.website) entity.website = profile.website ?? ""
  if (!entity.instagram) entity.instagram = profile.instagram_handle ?? ""
}

// Requires a session, then runs the real insert via `apply`.
export function submitApplication(entity, _, api) {
  const session = api.getEntity("session")
  if (!session?.user_id) {
    api.notify("#auth:open")
    return
  }
  api.notify(`#${entity.id}:apply`, {
    event_id: entity.event_id,
    full_name: entity.full_name,
    website: entity.website,
    instagram: entity.instagram,
    motivation: entity.motivation,
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
    api.notify("#events:loadEvents")
  },
  error(entity, err) {
    entity.applyStatus = "error"
    entity.applyError = err.message ?? "Application failed"
  },
})

export const loadDetail = handleAsync("loadDetail", {
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
    entity.error = err.message ?? "Failed to load event"
  },
})
