import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplicationMap } from "../../api/applications.js"
import { fetchOpenEvents } from "../../api/events.js"

export function search(entity, query) {
  entity.query = query
}

export function selectCategory(entity, categoryId) {
  entity.activeCategory = categoryId
  entity.activeFilter = "all"
}

export function selectFilter(entity, filterId) {
  entity.activeFilter = filterId
}

export function toggleFilters(entity) {
  entity.isFiltersVisible = !entity.isFiltersVisible
}

export function selectRegion(entity, region) {
  entity.activeRegion = region
}

export function selectPeriod(entity, periodId) {
  entity.activePeriod = periodId
}

export function clearFilters(entity) {
  entity.activeRegion = "all"
  entity.activePeriod = "all"
}

export function clearApplied(entity) {
  entity.appliedMap = {}
}

export const loadEvents = handleAsync("loadEvents", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run() {
    const [events, appliedMap] = await Promise.all([
      fetchOpenEvents(),
      fetchMyApplicationMap(),
    ])
    return { events, appliedMap }
  },
  success(entity, { events, appliedMap }) {
    entity.status = "ready"
    entity.events = events
    entity.appliedMap = appliedMap
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load events"
  },
})
