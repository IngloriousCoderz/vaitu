import { handleAsync } from "@inglorious/store/async"

import { fetchEventDetail } from "../../api/events.js"

export function open(entity, eventId, api) {
  entity.eventId = eventId
  entity.event = null
  entity.senderName = null
  entity.submitted = false
  entity.motivation = ""
  entity.fullName = ""
  entity.website = ""
  entity.instagram = ""
  api.notify(`#${entity.id}:loadDetail`, eventId)
}

export function close(entity) {
  entity.eventId = null
  entity.event = null
  entity.senderName = null
  entity.status = "idle"
  entity.error = null
  entity.submitted = false
}

export function setField(entity, { field, value }) {
  entity[field] = value
}

// Mocked until auth lands: flips to the feedback state without inserting.
export function submitApplication(entity) {
  entity.submitted = true
}

export const loadDetail = handleAsync("loadDetail", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run(eventId) {
    return fetchEventDetail(eventId)
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
