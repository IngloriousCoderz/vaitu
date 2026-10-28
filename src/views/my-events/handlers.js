import { handleAsync } from "@inglorious/store/async"

import { deleteEvent, fetchMyEvents } from "../../api/events.js"

export function deleteAsk(entity, event_id) {
  entity.confirmingDelete = event_id
}

export function deleteCancel(entity) {
  entity.confirmingDelete = null
}

export const load = handleAsync("load", {
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
    entity.error = err.message ?? "errors.loadEvents"
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
    entity.confirmingDelete = null
    api.notify(`#${entity.id}:load`)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "errors.deleteEvent"
  },
})
