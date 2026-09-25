import { handleAsync } from "@inglorious/store/async"

import { fetchOpenEvents } from "../../api/events.js"

export function search(entity, query) {
  entity.query = query
}

export function selectFilter(entity, filterId) {
  entity.activeFilter = filterId
}

export const loadEvents = handleAsync("loadEvents", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run() {
    return fetchOpenEvents()
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
