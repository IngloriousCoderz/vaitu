import {
  DAY_MS,
  FIRST_INDEX,
  ISO_DATE_LENGTH,
  MINUTE_MS,
} from "../../constants/index.js"
import { sameRegion } from "../../data/regions/resolve.js"
import { filterSections } from "./categories.js"
import {
  DEFAULT_SORT,
  periods,
  regionInEffect,
  typesInScope,
} from "./helpers.js"

const SORT_ORDERS = {
  created_desc: [["created_at", false]],
  created_asc: [["created_at", true]],
  event_date_desc: [["event_date", false]],
  event_date_asc: [["event_date", true]],
  deadline_asc: [["application_deadline", true]],
  deadline_desc: [["application_deadline", false]],
}

/**
 * The feed's filters as the database is asked them. Filtering, searching and
 * sorting happen there, so a page of results is right however many events
 * there are.
 *
 * `regions` are the regions on open events as stored, so a region chip can
 * ask for every spelling of its region.
 * @returns {{
 *   categories: string[],
 *   details: { key: string, category: string, values: string[] }[],
 *   regions: string[] | null,
 *   dateFrom: string | null,
 *   dateTo: string | null,
 *   search: string,
 *   order: [string, boolean][],
 * }} Empty categories mean every category, null regions every region, and an
 *   empty list of regions none.
 */
export function feedQuery({
  query,
  types,
  details,
  interests,
  region,
  period,
  favoriteRegions,
  regions,
  sort,
  today,
}) {
  const days = periods.find((item) => item.id === period)?.days ?? null
  return {
    categories: typesInScope(types, details, interests),
    details: filterSections([])
      .map((section) => ({
        key: section.id,
        category: section.category,
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
