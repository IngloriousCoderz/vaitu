import { handleAsync } from "@inglorious/store/async"

import { fetchEventDetail } from "../../api/events.js"

export function open(entity, event_id, api) {
  entity.event_id = event_id
  entity.event = null
  entity.sender_name = null
  entity.submitted = false
  entity.motivation = ""
  entity.full_name = ""
  entity.website = ""
  entity.instagram = ""
  api.notify(`#${entity.id}:loadDetail`, event_id)
}

export function close(entity) {
  entity.event_id = null
  entity.event = null
  entity.sender_name = null
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
  run(event_id) {
    return fetchEventDetail(event_id)
  },
  success(entity, { event, sender_name }) {
    entity.status = "ready"
    entity.event = event
    entity.sender_name = sender_name
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load event"
  },
})
