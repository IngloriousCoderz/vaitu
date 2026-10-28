import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplicationMap } from "../../api/applications.js"
import {
  fetchMyFeedDefaults,
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
import { withFilterTransition } from "./filter-transition.js"
import { DEFAULT_SORT, defaultRegion, distinctRegions } from "./helpers.js"

export function search(entity, query) {
  entity.query = query
}

export function typeToggle(entity, categoryId) {
  entity.activeTypes = toggled(entity.activeTypes, categoryId)
}

export function detailToggle(entity, value) {
  entity.activeDetails = toggled(entity.activeDetails, value)
}

export function filtersToggle(entity) {
  entity.isFiltersVisible = !entity.isFiltersVisible
}

// Picking the default region is the same as picking none, so it leaves no
// chip behind.
export function regionSelect(entity, region) {
  entity.activeRegion =
    region === defaultRegion(entity.favoriteRegions) ? null : region
}

export function periodSelect(entity, periodId) {
  entity.activePeriod = periodId
}

export function sortSelect(entity, payload) {
  entity.activeSort =
    typeof payload === "string" ? payload : (payload?.value ?? DEFAULT_SORT)
}

export function filtersClear(entity) {
  entity.activeTypes = []
  entity.activeDetails = []
  entity.activeRegion = null
  entity.activePeriod = "all"
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

export function favoritesEditClose(entity) {
  entity.favoritesStatus = "idle"
  favoritesEditCancel(entity)
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

export const load = handleAsync("load", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run() {
    const [events, appliedMap, defaults] = await Promise.all([
      fetchOpenEvents(),
      fetchMyApplicationMap(),
      fetchMyFeedDefaults(),
    ])
    return {
      events,
      appliedMap,
      favoriteRegions: defaults.favorite_regions,
      interests: defaults.interested_categories,
    }
  },
  success(entity, { events, appliedMap, favoriteRegions, interests }, api) {
    entity.status = "ready"
    entity.events = events
    entity.appliedMap = appliedMap
    entity.interests = interests
    if (!entity.isEditingFavorites) {
      entity.favoriteRegions = favoriteRegions
      keepRegion(entity)
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
    entity.error = err.message ?? "errors.loadEvents"
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
    entity.favoriteRegions = regions
    keepRegion(entity)
    api.notify("#profile:favoritesApply", regions)
    syncFavoriteCombobox(entity, api)
    // The close has to be its own update. This one is already rendering, and a
    // view transition needs to snapshot the open editor before it leaves.
    const id = entity.id
    queueMicrotask(() => {
      withFilterTransition(() => api.notify(`#${id}:favoritesEditClose`))
    })
  },
  error(entity, err) {
    entity.favoritesStatus = "error"
    entity.favoritesError = err.message ?? "errors.saveFavorites"
  },
})

// The picked region after the list of regions changed: the same one under
// its new spelling, or back to the default once it is gone or has become it.
function keepRegion(entity) {
  if (entity.activeRegion === null) return
  regionSelect(
    entity,
    activeRegionAfterChange(
      entity.activeRegion,
      regionFilterItems(distinctRegions(entity.events), entity.favoriteRegions),
    ),
  )
}

function toggled(list, value) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
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
