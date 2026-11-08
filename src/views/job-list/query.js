import {
  DAY_MS,
  FIRST_INDEX,
  ISO_DATE_LENGTH,
  MINUTE_MS,
} from "../../constants/index.js"
import { sameRegion } from "../../data/regions/resolve.js"
import {
  DEFAULT_SORT,
  jobTypesInScope,
  periods,
  professionsInScope,
  regionInEffect,
} from "./helpers.js"
import { filterSections } from "./job-settings.js"

// Which open jobs each status shows. Won jobs are assigned, not open: "all"
// and "won" add them separately, until the day of the job.
const OPEN_JOBS_BY_STATUS = {
  all: "all",
  open: "notApplied",
  applied: "applied",
  won: "none",
}

const SORT_ORDERS = {
  created_desc: [["created_at", false]],
  created_asc: [["created_at", true]],
  job_date_desc: [["job_date", false]],
  job_date_asc: [["job_date", true]],
  deadline_asc: [["application_deadline", true]],
  deadline_desc: [["application_deadline", false]],
}

/**
 * The feed's filters as the database is asked them. Filtering, searching and
 * sorting happen there, so a page of results is right however many jobs
 * there are.
 *
 * `regions` are the regions on open jobs as stored, so a region chip can
 * ask for every spelling of its region.
 * @returns {{
 *   jobTypes: string[],
 *   details: { key: string, settings: string[], values: string[] }[],
 *   regions: string[] | null,
 *   dateFrom: string | null,
 *   dateTo: string | null,
 *   search: string,
 *   order: [string, boolean][],
 *   scope: {
 *     openJobs: "all" | "notApplied" | "applied" | "none",
 *     appliedJobIds: string[],
 *     wonJobIds: string[],
 *     wonFrom: string,
 *   },
 * }} Empty job types mean all of them, null regions every region, and an empty list of regions none.
 */
export function feedQuery({
  query,
  types,
  details,
  interests,
  activeSettings = [],
  activeProfessions,
  myProfessions,
  region,
  period,
  favoriteRegions,
  regions,
  sort,
  today,
  status = "all",
  appliedJobIds = [],
  wonJobIds = [],
}) {
  const days = periods.find((item) => item.id === period)?.days ?? null
  return {
    jobTypes: jobTypesInScope(
      types,
      details,
      interests,
      professionsInScope(activeProfessions, myProfessions),
      activeSettings,
    ),
    details: filterSections([])
      .map((section) => ({
        key: section.id,
        settings: section.settings,
        values: details.filter((value) =>
          section.options.some((option) => option.id === value),
        ),
      }))
      .filter((section) => section.values.length),
    regions: regionSpellings(
      regionInEffect(region, favoriteRegions),
      regions,
      favoriteRegions,
    ),
    dateFrom: days === null ? null : today,
    dateTo: days === null ? null : addDays(today, days),
    search: plain(query),
    order: SORT_ORDERS[sort] ?? SORT_ORDERS[DEFAULT_SORT],
    scope: {
      openJobs: OPEN_JOBS_BY_STATUS[status] ?? OPEN_JOBS_BY_STATUS.all,
      appliedJobIds,
      wonJobIds: status === "all" || status === "won" ? wonJobIds : [],
      wonFrom: today,
    },
  }
}

export function localToday(now = new Date()) {
  const offset = now.getTimezoneOffset() * MINUTE_MS
  return new Date(now.getTime() - offset)
    .toISOString()
    .slice(FIRST_INDEX, ISO_DATE_LENGTH)
}

function plain(text) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

function addDays(isoDate, days) {
  const time = new Date(`${isoDate}T00:00:00Z`).getTime() + days * DAY_MS
  return new Date(time).toISOString().slice(FIRST_INDEX, ISO_DATE_LENGTH)
}

function regionSpellings(region, regions, favoriteRegions) {
  if (region === "all") return null
  if (region === "mine") {
    return regions.filter((stored) =>
      favoriteRegions.some((favorite) => sameRegion(favorite, stored)),
    )
  }
  return regions.filter((stored) => sameRegion(stored, region))
}
