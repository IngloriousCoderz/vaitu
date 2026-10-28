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

// The database filters, searches, sorts and pages the feed, so every change
// to what it shows asks it again from the first page.

// The box shows every keystroke; the query waits for a pause (searchRun).
export function search(entity, query) {
  entity.query = query
}

export function searchRun(entity, _, api) {
  refetch(entity, api)
}

// Types, styles and genres change which categories are in scope, and with
// them the regions on offer: those come first, then the page.
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

// Its ×, Esc or a click outside it.
export function filtersClose(entity) {
  entity.isFiltersVisible = false
}

// Picking the default region is the same as picking none, so it leaves no
// chip behind.
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

// The next page, when the end of the list scrolls into view.
export function pageMore(entity, _, api) {
  const isBusy = entity.status !== "ready" || entity.isLoadingMore
  if (isBusy || entity.events.length >= entity.total) return
  fetchPage(entity, api, {
    mode: "more",
    from: entity.events.length,
    to: entity.events.length + FEED_PAGE_SIZE - LAST_INDEX_OFFSET,
  })
}

// What the feed starts from (your interests and favorite regions) and which
// events you applied to. Then the regions, and the first page, or as many
// pages as were on screen when this is a refresh.
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

// The regions the feed could show an event in, for the categories in scope.
// A picked region they no longer include goes back to the default, and the
// page follows: `then` is the page fetch's mode.
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
    // The favorite-region picker offers the regions on events too.
    api.notify("#preferences:favoriteOptionsSync")
  },
})

// A page of events. Each request is numbered, and an answer to anything but
// the latest is dropped: typing in the search box sends one per keystroke,
// and they can come back in any order.
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

// The payloads below reach their run as a later event, after this handler's
// draft of the entity is revoked, so they carry copies of its arrays: one
// passed through as is (the interests, when nothing is picked) would throw on
// the first read.
function fetchRegions(entity, api, then) {
  entity.regionsRequest += 1
  // A reset shows the loader now, not only once the regions are back.
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

// A new event shifts every later one down a row, so the next page can repeat
// the last of this one.
function appended(events, page) {
  const ids = new Set(events.map((event) => event.id))
  return [...events, ...page.filter((event) => !ids.has(event.id))]
}

// The picked region after the list of regions changed: the same one under
// its new spelling, or back to the default once it is gone or has become it.
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
