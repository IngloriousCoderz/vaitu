import { handleAsync } from "@inglorious/store/async"

import { fetchMyEvents } from "../../api/events.js"

export const loadMyEvents = handleAsync("loadMyEvents", {
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
