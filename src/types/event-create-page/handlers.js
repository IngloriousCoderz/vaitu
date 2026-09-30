import { handleAsync } from "@inglorious/store/async"

import { createEvent } from "../../api/events.js"

export function open(entity) {
  entity.isOpen = true
  entity.status = "idle"
  entity.error = null
}

export function close(entity) {
  entity.isOpen = false
  entity.status = "idle"
  entity.error = null
}

export function setField(entity, { field, value }) {
  entity[field] = value
  entity.error = null
}

export function setDetailField(entity, { field, value }) {
  entity.details = { ...entity.details, [field]: value }
  entity.error = null
}

export function selectCategory(entity, category) {
  entity.category = category
  entity.details = {}
  entity.error = null
}

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run(event) {
    return createEvent({
      category: event.category,
      title: event.title,
      location: event.location,
      country: event.country,
      region: event.region,
      event_date: event.event_date,
      application_deadline:
        event.application_deadline.length === 16
          ? new Date(event.application_deadline).toISOString()
          : event.application_deadline,
      max_applicants: Number(event.max_applicants) || 5,
      details: event.details,
    })
  },
  success(entity, _, api) {
    entity.status = "ready"
    api.notify(`#${entity.id}:close`)
    api.notify("#my_events:loadMyEvents")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to create event"
  },
})
