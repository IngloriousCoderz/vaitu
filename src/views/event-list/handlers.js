import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplicationMap } from "../../api/applications.js"
import {
  fetchMyFeedDefaults,
  fetchOpenEventRegions,
  fetchOpenEventsPage,
} from "../../api/events.js"
import {
  FEED_PAGE_SIZE,
  FIRST_INDEX,
  LAST_INDEX_OFFSET,
} from "../../constants/index.js"
import {
  activeRegionAfterChange,
  regionFilterItems,
} from "../../data/regions/resolve.js"
import {
  DEFAULT_SORT,
  defaultRegion,
  distinctRegions,
  typesInScope,
} from "./helpers.js"
import { feedQuery, localToday } from "./query.js"

export function search(entity, query) {
  entity.query = query
}

export function searchRun(entity, _, api) {
  refetch(entity, api)
}

export function typeToggle(entity, categoryId, api) {
  entity.activeTypes = toggled(entity.activeTypes, categoryId)
  fetchRegions(entity, api, "reset")
}

export function detailToggle(entity, value, api) {
  entity.activeDetails = toggled(entity.activeDetails, value)
  fetchRegions(entity, api, "reset")
}

export function filtersToggle(entity) {
  entity.isFiltersVisible = !entity.isFiltersVisible
}

export function filtersClose(entity) {
  entity.isFiltersVisible = false
}

export function regionSelect(entity, region, api) {
  entity.activeRegion =
    region === defaultRegion(entity.favoriteRegions) ? null : region
  refetch(entity, api)
}

export function periodSelect(entity, periodId, api) {
  entity.activePeriod = periodId
  refetch(entity, api)
}

export function sortSelect(entity, payload, api) {
  entity.activeSort =
    typeof payload === "string" ? payload : (payload?.value ?? DEFAULT_SORT)
  refetch(entity, api)
}

export function filtersClear(entity, _, api) {
  entity.activeTypes = []
  entity.activeDetails = []
  entity.activeRegion = null
  entity.activePeriod = "all"
  fetchRegions(entity, api, "reset")
}

export function pageMore(entity, _, api) {
  const isBusy = entity.status !== "ready" || entity.isLoadingMore
  if (isBusy || entity.events.length >= entity.total) return
  fetchPage(entity, api, {
    mode: "more",
    from: entity.events.length,
    to: entity.events.length + FEED_PAGE_SIZE - LAST_INDEX_OFFSET,
  })
}

export const load = handleAsync("load", {
  start(entity) {
    if (!entity.events.length) entity.status = "loading"
    entity.error = null
  },
  async run() {
    const [appliedMap, defaults] = await Promise.all([
      fetchMyApplicationMap(),
      fetchMyFeedDefaults(),
    ])
    return {
      appliedMap,
      favoriteRegions: defaults.favorite_regions,
      interests: defaults.interested_categories,
    }
  },
  success(entity, { appliedMap, favoriteRegions, interests }, api) {
    entity.appliedMap = appliedMap
    entity.interests = interests
    entity.favoriteRegions = favoriteRegions
    fetchRegions(entity, api, "refresh")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "errors.loadEvents"
  },
})

export const regionsFetch = handleAsync("regionsFetch", {
  async run({ request, categories, then }) {
    try {
      return { request, then, regions: await fetchOpenEventRegions(categories) }
    } catch (error) {
      return { request, then, error }
    }
  },
  success(entity, { request, then, regions, error }, api) {
    if (request !== entity.regionsRequest) return
    if (error) {
      entity.status = "error"
      entity.error = error.message ?? "errors.loadEvents"
      return
    }
    entity.regions = regions
    keepRegion(entity)
    if (then === "refresh") {
      fetchPage(entity, api, {
        mode: "refresh",
        from: FIRST_INDEX,
        to: Math.max(entity.events.length, FEED_PAGE_SIZE) - LAST_INDEX_OFFSET,
      })
    } else {
      refetch(entity, api)
    }
    api.notify("#preferences:favoriteOptionsSync")
  },
})

export const pageFetch = handleAsync("pageFetch", {
  start(entity, { mode }) {
    if (mode === "reset") entity.status = "loading"
    if (mode === "more") entity.isLoadingMore = true
    entity.error = null
  },
  async run({ request, mode, feed, from, to }) {
    try {
      const page = await fetchOpenEventsPage(feed, { from, to })
      return { request, mode, ...page }
    } catch (error) {
      return { request, mode, error }
    }
  },
  success(entity, { request, mode, events, total, error }) {
    if (request !== entity.request) return
    entity.isLoadingMore = false
    if (error) {
      entity.status = "error"
      entity.error = error.message ?? "errors.loadEvents"
      return
    }
    entity.status = "ready"
    entity.total = total
    entity.events = mode === "more" ? appended(entity.events, events) : events
  },
})

// Copies: the runs read them after this draft is revoked.
function fetchRegions(entity, api, then) {
  entity.regionsRequest += 1
  if (then === "reset") entity.status = "loading"
  api.notify(`#${entity.id}:regionsFetch`, {
    request: entity.regionsRequest,
    then,
    categories: typesInScope(
      [...entity.activeTypes],
      [...entity.activeDetails],
      [...entity.interests],
    ),
  })
}

function refetch(entity, api) {
  fetchPage(entity, api, {
    mode: "reset",
    from: FIRST_INDEX,
    to: FEED_PAGE_SIZE - LAST_INDEX_OFFSET,
  })
}

function fetchPage(entity, api, { mode, from, to }) {
  entity.request += 1
  api.notify(`#${entity.id}:pageFetch`, {
    request: entity.request,
    mode,
    from,
    to,
    feed: feedQuery({
      query: entity.query,
      types: [...entity.activeTypes],
      details: [...entity.activeDetails],
      interests: [...entity.interests],
      region: entity.activeRegion,
      period: entity.activePeriod,
      favoriteRegions: [...entity.favoriteRegions],
      regions: [...entity.regions],
      sort: entity.activeSort,
      today: localToday(),
    }),
  })
}

function appended(events, page) {
  const ids = new Set(events.map((event) => event.id))
  return [...events, ...page.filter((event) => !ids.has(event.id))]
}

function keepRegion(entity) {
  if (entity.activeRegion === null) return
  const region = activeRegionAfterChange(
    entity.activeRegion,
    regionFilterItems(distinctRegions(entity.regions), entity.favoriteRegions),
  )
  entity.activeRegion =
    region === defaultRegion(entity.favoriteRegions) ? null : region
}

function toggled(list, value) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}
