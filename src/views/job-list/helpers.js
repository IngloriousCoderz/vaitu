import {
  jobTypesFor,
  offeredSettings,
  professions as allProfessions,
} from "../../data/job-taxonomy.js"
import { uniqueRegions } from "../../data/regions/resolve.js"
import { detailAppliesTo, filterSections } from "./job-settings.js"

export const statuses = [
  { id: "all", label: "jobStatuses.all" },
  { id: "open", label: "jobStatuses.open" },
  { id: "applied", label: "jobStatuses.applied" },
  { id: "won", label: "jobStatuses.won" },
]

export const periods = [
  { id: "all", days: null, label: "periods.all" },
  { id: "week", days: 7, label: "periods.week" },
  { id: "month", days: 30, label: "periods.month" },
  { id: "quarter", days: 90, label: "periods.quarter" },
]

export const DEFAULT_SORT = "created_desc"

export const sorts = [
  { value: "created_desc", label: "sorts.createdNewest" },
  { value: "created_asc", label: "sorts.createdOldest" },
  { value: "job_date_desc", label: "sorts.jobDateNewest" },
  { value: "job_date_asc", label: "sorts.jobDateOldest" },
  { value: "deadline_asc", label: "sorts.deadlineSoonest" },
  { value: "deadline_desc", label: "sorts.deadlineFarthest" },
]

/**
 * The count and the order picker stay while a new search loads over the jobs
 * on screen, and wait for the first ones.
 */
export function hasResultsBar(status, jobCount) {
  return status === "ready" || (status === "loading" && Boolean(jobCount))
}

export function distinctRegions(regions) {
  return uniqueRegions(regions).sort((a, b) => a.localeCompare(b))
}

/**
 * The job types a feed asks for: those of the settings and professions in
 * scope, narrowed to the ones the picked styles and genres apply to.
 */
export function jobTypesInScope(details, settings, professions) {
  const available = jobTypesFor(professions, settings)
  const fromDetails = available.filter((jobType) =>
    details.some((value) => detailAppliesTo(value, jobType)),
  )
  return (fromDetails.length ? fromDetails : available).map(
    (jobType) => jobType.id,
  )
}

/** What the feed picks, else what the profile does. */
export function inScope(active, mine = []) {
  return active.length ? active : mine
}

export function defaultRegion(favoriteRegions) {
  return favoriteRegions.length ? "mine" : "all"
}

export function regionInEffect(activeRegion, favoriteRegions) {
  return activeRegion ?? defaultRegion(favoriteRegions)
}

export function activeFilters({
  settings = [],
  professions,
  details,
  region,
  period,
  status = "all",
  regions,
}) {
  const detailOptions = filterSections([]).flatMap((section) => section.options)
  const regionItem = regions.find((item) => item.id === region)
  const periodItem = periods.find((item) => item.id === period)
  return [
    ...settings.map((id) => ({
      kind: "setting",
      id,
      label: offeredSettings.find((option) => option.id === id)?.label ?? id,
    })),
    ...professions.map((id) => ({
      kind: "profession",
      id,
      label: allProfessions.find((option) => option.id === id)?.label ?? id,
    })),
    ...details.map((id) => ({
      kind: "detail",
      id,
      label: detailOptions.find((option) => option.id === id)?.label ?? id,
    })),
    ...(region === null
      ? []
      : [
          {
            kind: "region",
            id: region,
            label: regionItem?.label ?? region,
          },
        ]),
    ...(period === "all" || !periodItem
      ? []
      : [{ kind: "period", id: period, label: periodItem.label }]),
    ...(status === "all"
      ? []
      : [
          {
            kind: "status",
            id: status,
            label: statuses.find((item) => item.id === status)?.label ?? status,
          },
        ]),
  ]
}
