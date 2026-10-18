import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplicationMap } from "../../api/applications.js"
import {
  deleteEvent,
  fetchMyEvents,
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
} from "../../data/regions/resolve.js"
import { t } from "../../i18n/index.js"
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

export function ownerSelect(entity, owner) {
  entity.activeOwner = owner
  entity.confirmingDelete = null
}

export function filtersClear(entity) {
  entity.activeRegion = "all"
  entity.activePeriod = "all"
}

export function deleteAsk(entity, event_id) {
  entity.confirmingDelete = event_id
}

export function deleteCancel(entity) {
  entity.confirmingDelete = null
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
  entity.myEvents = []
  entity.activeOwner = "explore"
  entity.confirmingDelete = null
}

export const eventsLoad = handleAsync("eventsLoad", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run() {
    const [events, myEvents, appliedMap, favoriteRegions] = await Promise.all([
      fetchOpenEvents(),
      fetchMyEvents(),
      fetchMyApplicationMap(),
      fetchMyFavoriteRegions(),
    ])
    return { events, myEvents, appliedMap, favoriteRegions }
  },
  success(entity, { events, myEvents, appliedMap, favoriteRegions }, api) {
    entity.status = "ready"
    entity.events = events
    entity.myEvents = myEvents
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
    entity.error = err.message ?? t("errors.loadEvents")
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
    api.notify(`#${entity.id}:eventsLoad`)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? t("errors.deleteEvent")
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
    entity.favoritesError = err.message ?? t("errors.saveFavorites")
  },
})
