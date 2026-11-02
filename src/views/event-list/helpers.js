import {
  interestsFor,
  jobTypeById,
  jobTypesFor,
  professions as allProfessions,
} from "../../data/event-taxonomy.js"
import { uniqueRegions } from "../../data/regions/resolve.js"
import { detailAppliesTo, filterSections } from "./categories.js"

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
  { value: "event_date_desc", label: "sorts.eventDateNewest" },
  { value: "event_date_asc", label: "sorts.eventDateOldest" },
  { value: "deadline_asc", label: "sorts.deadlineSoonest" },
  { value: "deadline_desc", label: "sorts.deadlineFarthest" },
]

export function distinctRegions(regions) {
  return uniqueRegions(regions).sort((a, b) => a.localeCompare(b))
}

/**
 * The job types a feed asks for: the picked ones and those of each picked style
 * or genre, else your interests, else all of the trades in scope.
 */
export function jobTypesInScope(types, details, interests, professions) {
  const available = jobTypesFor(professions)
  const fromDetails = details.flatMap((value) =>
    available
      .filter((jobType) => detailAppliesTo(value, jobType))
      .map((jobType) => jobType.id),
  )
  const picked = [...new Set([...types, ...fromDetails])]
  if (picked.length) return picked
  const interesting = interestsFor(interests, professions)
  if (interesting.length) return interesting
  return available.map((jobType) => jobType.id)
}

export function professionsInScope(activeProfessions, professions = []) {
  return activeProfessions.length ? activeProfessions : professions
}

export function defaultRegion(favoriteRegions) {
  return favoriteRegions.length ? "mine" : "all"
}

export function regionInEffect(activeRegion, favoriteRegions) {
  return activeRegion ?? defaultRegion(favoriteRegions)
}

export function activeFilters({
  types,
  professions,
  details,
  region,
  period,
  regions,
}) {
  const detailOptions = filterSections([]).flatMap((section) => section.options)
  const regionItem = regions.find((item) => item.id === region)
  const periodItem = periods.find((item) => item.id === period)
  return [
    ...types.map((id) => ({
      kind: "type",
      id,
      label: jobTypeById(id)?.label ?? id,
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
  ]
}
