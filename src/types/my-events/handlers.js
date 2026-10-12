import { handleAsync } from "@inglorious/store/async"

import { deleteEvent, fetchMyEvents } from "../../api/events.js"
import { registerRealtime, unregisterRealtime } from "../../realtime.js"

export function open(entity) {
  registerRealtime("my_events_applications", {
    table: "applications",
    event: `#${entity.id}:eventsLoad`,
  })
  registerRealtime("my_events_events", {
    table: "events",
    event: `#${entity.id}:eventsLoad`,
  })
}

export function close() {
  unregisterRealtime("my_events_applications")
  unregisterRealtime("my_events_events")
}

export function deleteAsk(entity, event_id) {
  entity.confirming_delete = event_id
}

export function deleteCancel(entity) {
  entity.confirming_delete = null
}

export const eventsLoad = handleAsync("eventsLoad", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run() {
    return fetchMyEvents()
  },
  success(entity, events) {
    entity.status = "ready"
    entity.events = events
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load events"
  },
})

export const eventRemove = handleAsync("eventRemove", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  run(event_id) {
    return deleteEvent(event_id)
  },
  success(entity, _, api) {
    entity.status = "ready"
    entity.confirming_delete = null
    api.notify(`#${entity.id}:eventsLoad`)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to delete event"
  },
})
