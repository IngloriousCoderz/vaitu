import { handleAsync } from "@inglorious/store/async"

import {
  createEvent,
  fetchEventForEdit,
  updateEvent,
} from "../../api/events.js"
import {
  DATETIME_LOCAL_LENGTH,
  DEFAULT_MAX_APPLICANTS,
  FIRST_INDEX,
} from "../../constants.js"

export function open(entity, { event_id } = {}, api) {
  entity.isOpen = true
  entity.status = "idle"
  entity.error = null
  entity.editing_event_id = event_id ?? null
  entity.category = "wedding"
  entity.title = ""
  entity.location = ""
  entity.country = ""
  entity.region = ""
  entity.event_date = ""
  entity.application_deadline = ""
  entity.max_applicants = 5
  entity.details = {}
  api.notify("#country-create:sync", "")
  if (event_id) api.notify(`#${entity.id}:editLoad`, event_id)
}

export function close(entity) {
  entity.isOpen = false
  entity.status = "idle"
  entity.error = null
}

export function overlaysClose(entity) {
  close(entity)
}

export function fieldSet(entity, { field, value }) {
  entity[field] = value
  entity.error = null
}

export function detailFieldSet(entity, { field, value }) {
  entity.details = { ...entity.details, [field]: value }
  entity.error = null
}

export function categorySelect(entity, category) {
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
    const payload = {
      category: event.category,
      title: event.title,
      location: event.location,
      country: event.country,
      region: event.region,
      event_date: event.event_date,
      application_deadline:
        event.application_deadline.length === DATETIME_LOCAL_LENGTH
          ? new Date(event.application_deadline).toISOString()
          : event.application_deadline,
      max_applicants: Number(event.max_applicants) || DEFAULT_MAX_APPLICANTS,
      details: event.details,
    }
    if (event.editing_event_id) {
      return updateEvent(event.editing_event_id, payload)
    }
    return createEvent(payload)
  },
  success(entity, _, api) {
    entity.status = "ready"
    api.notify(`#${entity.id}:close`)
    api.notify("#my_events:eventsLoad")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to save event"
  },
})

export const editLoad = handleAsync("editLoad", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run(event_id) {
    return fetchEventForEdit(event_id)
  },
  success(entity, row, api) {
    entity.status = "ready"
    entity.category = row.category
    entity.title = row.title
    entity.location = row.location
    entity.country = row.country
    entity.region = row.region
    entity.event_date = row.event_date
    entity.application_deadline = row.application_deadline.slice(
      FIRST_INDEX,
      DATETIME_LOCAL_LENGTH,
    )
    entity.max_applicants = row.max_applicants
    entity.details = row.details
    api.notify("#country-create:sync", row.country ?? "")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load event"
  },
})
