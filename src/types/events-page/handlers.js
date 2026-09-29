import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplicationEventIds } from "../../api/applications.js"
import { fetchOpenEvents } from "../../api/events.js"

export function search(entity, query) {
  entity.query = query
}

export function selectCategory(entity, category_id) {
  entity.active_category = category_id
  entity.active_filter = "all"
}

export function selectFilter(entity, filter_id) {
  entity.active_filter = filter_id
}

export function toggleFilters(entity) {
  entity.show_filters = !entity.show_filters
}

export function selectRegion(entity, region) {
  entity.active_region = region
}

export function selectPeriod(entity, period_id) {
  entity.active_period = period_id
}

export function clearFilters(entity) {
  entity.active_region = "all"
  entity.active_period = "all"
}

export const loadEvents = handleAsync("loadEvents", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run() {
    const [events, applied_event_ids] = await Promise.all([
      fetchOpenEvents(),
      fetchMyApplicationEventIds(),
    ])
    return { events, applied_event_ids }
  },
  success(entity, { events, applied_event_ids }) {
    entity.status = "ready"
    entity.events = events
    entity.applied_event_ids = applied_event_ids
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load events"
  },
})
