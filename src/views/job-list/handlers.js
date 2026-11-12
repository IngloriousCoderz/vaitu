import { handleRequest } from "@inglorious/store/async"

import { fetchMyApplicationMap } from "../../api/applications.js"
import { errorKey } from "../../api/errors.js"
import {
  fetchFeedRegions,
  fetchMyFeedDefaults,
  fetchOpenJobsPage,
} from "../../api/jobs.js"
import { signedInId } from "../../common/session/index.js"
import {
  FEED_PAGE_SIZE,
  FIRST_INDEX,
  LAST_INDEX_OFFSET,
} from "../../constants/index.js"
import { jobTypesFor } from "../../data/job-taxonomy.js"
import {
  activeRegionAfterChange,
  regionFilterItems,
} from "../../data/regions/resolve.js"
import {
  DEFAULT_SORT,
  defaultRegion,
  distinctRegions,
  inScope,
  jobTypesInScope,
} from "./helpers.js"
import { detailAppliesTo } from "./job-settings.js"
import { feedQuery, localToday } from "./query.js"

export function search(entity, query) {
  entity.query = query
}

export function searchRun(entity, _, api) {
  refetch(entity, api)
}

export function settingToggle(entity, settingId, api) {
  entity.activeSettings = toggled(entity.activeSettings, settingId)
  reachChange(entity, api)
}

export function professionToggle(entity, professionId, api) {
  entity.activeProfessions = toggled(entity.activeProfessions, professionId)
  reachChange(entity, api)
}

function reachChange(entity, api) {
  const available = jobTypesFor(
    inScope([...entity.activeProfessions], [...entity.professions]),
    inScope([...entity.activeSettings], [...entity.settings]),
  )
  entity.activeDetails = entity.activeDetails.filter((value) =>
    available.some((jobType) => detailAppliesTo(value, jobType)),
  )
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

export function statusSelect(entity, statusId, api) {
  entity.activeStatus = statusId
  refetch(entity, api)
}

export function sortSelect(entity, payload, api) {
  entity.activeSort =
    typeof payload === "string" ? payload : (payload?.value ?? DEFAULT_SORT)
  refetch(entity, api)
}

export function filtersClear(entity, _, api) {
  entity.activeSettings = []
  entity.activeProfessions = []
  entity.activeDetails = []
  entity.activeRegion = null
  entity.activePeriod = "all"
  entity.activeStatus = "all"
  fetchRegions(entity, api, "reset")
}

export function pageMore(entity, _, api) {
  const isBusy = entity.status !== "ready" || entity.isLoadingMore
  if (isBusy || entity.jobs.length >= entity.total) return
  fetchPage(entity, api, {
    mode: "more",
    from: entity.jobs.length,
    to: entity.jobs.length + FEED_PAGE_SIZE - LAST_INDEX_OFFSET,
  })
}

export const load = handleRequest(
  "load",
  {
    start(entity) {
      if (!entity.jobs.length) entity.status = "loading"
    },
    async run() {
      const [{ appliedMap, wonJobIds }, defaults] = await Promise.all([
        fetchMyApplicationMap(localToday()),
        fetchMyFeedDefaults(),
      ])
      return {
        appliedMap,
        wonJobIds,
        favoriteRegions: defaults.favorite_regions,
        settings: defaults.interested_settings,
        professions: defaults.professions,
      }
    },
    success(
      entity,
      { appliedMap, wonJobIds, favoriteRegions, settings, professions },
      api,
    ) {
      entity.appliedMap = appliedMap
      entity.wonJobIds = wonJobIds
      entity.settings = settings
      entity.professions = professions
      entity.favoriteRegions = favoriteRegions
      api.notify("#jobCreate:jobTypeOptionsSync")
      fetchRegions(entity, api, "refresh")
    },
    error(entity) {
      entity.status = "error"
    },
  },
  { status: "loadStatus", toError: loadError },
)

export const regionsFetch = handleRequest(
  "regionsFetch",
  {
    start(entity, { then }) {
      if (then === "reset") entity.status = "loading"
    },
    async run({ then, jobTypes, wonJobIds, today }) {
      return {
        then,
        regions: await fetchFeedRegions(jobTypes, { wonJobIds, today }),
      }
    },
    success(entity, { then, regions }, api) {
      entity.regions = regions
      keepRegion(entity)
      if (then === "refresh") {
        fetchPage(entity, api, {
          mode: "refresh",
          from: FIRST_INDEX,
          to: Math.max(entity.jobs.length, FEED_PAGE_SIZE) - LAST_INDEX_OFFSET,
        })
      } else {
        refetch(entity, api)
      }
      api.notify("#preferences:favoriteOptionsSync")
      api.notify("#onboarding:favoriteOptionsSync")
    },
    error(entity) {
      entity.status = "error"
    },
  },
  { status: "regionsStatus", toError: loadError },
)

export const pageFetch = handleRequest(
  "pageFetch",
  {
    start(entity, { mode }) {
      if (mode === "reset") entity.status = "loading"
      if (mode === "more") entity.isLoadingMore = true
    },
    async run({ mode, feed, from, to }, api) {
      const page = await fetchOpenJobsPage(feed, { from, to }, signedInId(api))
      return { mode, ...page }
    },
    success(entity, { mode, jobs, total }) {
      entity.isLoadingMore = false
      entity.status = "ready"
      entity.total = total
      entity.jobs = mode === "more" ? appended(entity.jobs, jobs) : jobs
    },
    error(entity) {
      entity.isLoadingMore = false
      entity.status = "error"
    },
  },
  { status: "pageStatus", toError: loadError },
)

// Copies: the runs read them after this draft is revoked.
function fetchRegions(entity, api, then) {
  api.notify(`#${entity.id}:regionsFetch`, {
    then,
    jobTypes: jobTypesInScope(
      [...entity.activeDetails],
      inScope([...entity.activeSettings], [...entity.settings]),
      inScope([...entity.activeProfessions], [...entity.professions]),
    ),
    wonJobIds: [...entity.wonJobIds],
    today: localToday(),
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
  api.notify(`#${entity.id}:pageFetch`, {
    mode,
    from,
    to,
    feed: feedQuery({
      query: entity.query,
      details: [...entity.activeDetails],
      activeSettings: [...entity.activeSettings],
      mySettings: [...entity.settings],
      activeProfessions: [...entity.activeProfessions],
      myProfessions: [...entity.professions],
      region: entity.activeRegion,
      period: entity.activePeriod,
      favoriteRegions: [...entity.favoriteRegions],
      regions: [...entity.regions],
      sort: entity.activeSort,
      today: localToday(),
      status: entity.activeStatus,
      appliedJobIds: Object.keys(entity.appliedMap),
      wonJobIds: [...entity.wonJobIds],
    }),
  })
}

function loadError(error) {
  return errorKey(error, "errors.loadJobs")
}

function appended(jobs, page) {
  const ids = new Set(jobs.map((job) => job.id))
  return [...jobs, ...page.filter((job) => !ids.has(job.id))]
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
