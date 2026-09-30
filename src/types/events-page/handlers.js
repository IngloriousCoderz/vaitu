import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplicationMap } from "../../api/applications.js"
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

export function clearApplied(entity) {
  entity.applied_map = {}
}

export const loadEvents = handleAsync("loadEvents", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run() {
    const [events, applied_map] = await Promise.all([
      fetchOpenEvents(),
      fetchMyApplicationMap(),
    ])
    return { events, applied_map }
  },
  success(entity, { events, applied_map }) {
    entity.status = "ready"
    entity.events = events
    entity.applied_map = applied_map
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load events"
  },
})
