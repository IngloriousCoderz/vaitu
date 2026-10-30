import { uniqueRegions } from "../../data/regions/resolve.js"
import { labelled, translatedLabel } from "../../i18n/index.js"
import { categoryById, categoryOfDetail, filterSections } from "./categories.js"

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

export function typesInScope(types, details, interests = []) {
  const fromDetails = details.map(categoryOfDetail).filter(Boolean)
  const picked = [...new Set([...types, ...fromDetails])]
  return picked.length ? picked : interests
}

export function defaultRegion(favoriteRegions) {
  return favoriteRegions.length ? "mine" : "all"
}

export function regionInEffect(activeRegion, favoriteRegions) {
  return activeRegion ?? defaultRegion(favoriteRegions)
}

export function activeFilters({ types, details, region, period, regions }) {
  const detailOptions = filterSections([]).flatMap((section) => section.options)
  const regionItem = regions.find((item) => item.id === region)
  const periodItem = periods.find((item) => item.id === period)
  return [
    ...types.map((id) => ({
      kind: "type",
      id,
      label: categoryById(id).label,
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
