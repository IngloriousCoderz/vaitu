import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplicationMap } from "../../api/applications.js"
import { fetchMyFavoriteRegions, fetchOpenEvents } from "../../api/events.js"

export function search(entity, query) {
  entity.query = query
}

export function categorySelect(entity, categoryId) {
  entity.activeCategory = categoryId
  entity.activeFilter = "all"
}

export function filterSelect(entity, filterId) {
  entity.activeFilter = filterId
}

export function filtersToggle(entity) {
  entity.isFiltersVisible = !entity.isFiltersVisible
}

export function regionSelect(entity, region) {
  entity.activeRegion = region
}

export function periodSelect(entity, periodId) {
  entity.activePeriod = periodId
}

export function filtersClear(entity) {
  entity.activeRegion = "all"
  entity.activePeriod = "all"
}

export function appliedClear(entity) {
  entity.appliedMap = {}
}

export const eventsLoad = handleAsync("eventsLoad", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run() {
    const [events, appliedMap, favoriteRegions] = await Promise.all([
      fetchOpenEvents(),
      fetchMyApplicationMap(),
      fetchMyFavoriteRegions(),
    ])
    return { events, appliedMap, favoriteRegions }
  },
  success(entity, { events, appliedMap, favoriteRegions }) {
    entity.status = "ready"
    entity.events = events
    entity.appliedMap = appliedMap
    entity.favoriteRegions = favoriteRegions
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load events"
  },
})
