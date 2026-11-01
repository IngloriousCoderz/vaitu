import {
  interestsFor,
  jobTypeById,
  jobTypesFor,
  professions as allProfessions,
} from "../../data/event-taxonomy.js"
import { uniqueRegions } from "../../data/regions/resolve.js"
import { labelled, translatedLabel } from "../../i18n/index.js"
import { detailAppliesTo, filterSections } from "./categories.js"

export const periods = [
  labelled("periods.all", { id: "all", days: null }),
  labelled("periods.week", { id: "week", days: 7 }),
  labelled("periods.month", { id: "month", days: 30 }),
  labelled("periods.quarter", { id: "quarter", days: 90 }),
]

export const DEFAULT_SORT = "created_desc"

export const sorts = [
  labelled("sorts.createdNewest", { value: "created_desc" }),
  labelled("sorts.createdOldest", { value: "created_asc" }),
  labelled("sorts.eventDateNewest", { value: "event_date_desc" }),
  labelled("sorts.eventDateOldest", { value: "event_date_asc" }),
  labelled("sorts.deadlineSoonest", { value: "deadline_asc" }),
  labelled("sorts.deadlineFarthest", { value: "deadline_desc" }),
]

export function distinctRegions(regions) {
  return uniqueRegions(regions).sort((a, b) => a.localeCompare(b))
}

/**
 * The job types a feed asks for: the picked ones and those of each picked style
 * or genre, else your interests, else all of the trades in scope. Empty means
 * every job type.
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
  return professions.length ? available.map((jobType) => jobType.id) : []
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
            label: regionItem ? translatedLabel(regionItem) : region,
          },
        ]),
    ...(period === "all" || !periodItem
      ? []
      : [{ kind: "period", id: period, label: periodItem.label }]),
  ]
}
