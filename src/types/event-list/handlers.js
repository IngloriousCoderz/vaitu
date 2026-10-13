import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplicationMap } from "../../api/applications.js"
import {
  fetchMyFavoriteRegions,
  fetchOpenEvents,
  saveFavoriteRegions,
} from "../../api/events.js"
import {
  activeRegionAfterChange,
  canonicalRegion,
  favoriteRegionOptions,
  regionFilterItems,
  sameRegion,
} from "../../regions.js"
import { distinctRegions } from "./helpers.js"

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

function syncFavoriteCombobox(entity, api) {
  if (!api) return
  api.notify("#favorite-region-list:sync", "")
  api.notify(
    "#favorite-region-list:optionsSet",
    favoriteRegionOptions(
      (entity.events ?? []).map((event) => event.region),
      entity.isEditingFavorites ? (entity.favoriteDraft ?? []) : [],
    ),
  )
}

export function favoritesEditStart(entity, _, api) {
  if (entity.isEditingFavorites) return
  entity.isEditingFavorites = true
  entity.favoriteDraft = [...entity.favoriteRegions]
  entity.favoriteInput = ""
  entity.favoritesError = null
  syncFavoriteCombobox(entity, api)
}

export function favoritesEditCancel(entity) {
  entity.isEditingFavorites = false
  entity.favoriteInput = ""
  entity.favoritesError = null
}

export function favoriteDraftInput(entity, value) {
  entity.favoriteInput = value ?? ""
}

export function favoriteDraftAdd(entity, value, api) {
  const clean = canonicalRegion(value)
  if (!clean) return
  if (!entity.favoriteDraft.some((region) => sameRegion(region, clean))) {
    entity.favoriteDraft = [...entity.favoriteDraft, clean]
  }
  entity.favoriteInput = ""
  entity.favoritesError = null
  syncFavoriteCombobox(entity, api)
}

export function favoriteChoiceSelect(entity, { value }, api) {
  favoriteDraftAdd(entity, value, api)
}

export function favoriteDraftRemove(entity, value, api) {
  entity.favoriteDraft = entity.favoriteDraft.filter(
    (region) => !sameRegion(region, value),
  )
  syncFavoriteCombobox(entity, api)
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
  success(entity, { events, appliedMap, favoriteRegions }, api) {
    entity.status = "ready"
    entity.events = events
    entity.appliedMap = appliedMap
    if (!entity.isEditingFavorites) {
      entity.favoriteRegions = favoriteRegions
      entity.activeRegion = activeRegionAfterChange(
        entity.activeRegion,
        regionFilterItems(distinctRegions(events), favoriteRegions),
      )
    }
    syncFavoriteCombobox(entity, api)
    const profile = api.getEntity("profile")
    api.notify(
      "#favorite-region-profile:optionsSet",
      favoriteRegionOptions(
        events.map((event) => event.region),
        profile?.isEditing ? (profile.values?.favorite_regions ?? []) : [],
      ),
    )
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load events"
  },
})

export const favoritesSave = handleAsync("favoritesSave", {
  start(entity) {
    entity.favoritesStatus = "saving"
    entity.favoritesError = null
  },
  async run(regions) {
    return saveFavoriteRegions(regions)
  },
  success(entity, regions, api) {
    entity.favoritesStatus = "idle"
    entity.isEditingFavorites = false
    entity.favoriteInput = ""
    entity.favoriteRegions = regions
    entity.activeRegion = activeRegionAfterChange(
      entity.activeRegion,
      regionFilterItems(distinctRegions(entity.events), regions),
    )
    api.notify("#profile:favoritesApply", regions)
    syncFavoriteCombobox(entity, api)
  },
  error(entity, err) {
    entity.favoritesStatus = "error"
    entity.favoritesError = err.message ?? "Failed to save favorite regions"
  },
})
