import { FIRST_INDEX } from "../../constants/index.js"
import { sameRegion, uniqueRegions } from "../../data/regions/resolve.js"
import { labelled, translatedLabel } from "../../i18n/index.js"
import { categoryById, categoryOfDetail, filterSections } from "./categories.js"

// An event happening today is already in every period.
const TODAY = 0
// What localeCompare answers for two equal strings.
const SAME_ORDER = 0

export const periods = [
  labelled("periods.all", { id: "all", days: null }),
  labelled("periods.week", { id: "week", days: 7 }),
  labelled("periods.month", { id: "month", days: 30 }),
  labelled("periods.quarter", { id: "quarter", days: 90 }),
]

// Newest created first — the usual feed default.
export const DEFAULT_SORT = "created_desc"

export const sorts = [
  labelled("sorts.createdNewest", { value: "created_desc" }),
  labelled("sorts.createdOldest", { value: "created_asc" }),
  labelled("sorts.eventDateNewest", { value: "event_date_desc" }),
  labelled("sorts.eventDateOldest", { value: "event_date_asc" }),
  labelled("sorts.deadlineSoonest", { value: "deadline_asc" }),
  labelled("sorts.deadlineFarthest", { value: "deadline_desc" }),
]

export function distinctRegions(allEvents) {
  return uniqueRegions(allEvents.map((event) => event.region)).sort((a, b) =>
    a.localeCompare(b),
  )
}

// The categories the feed shows. A picked style or genre brings its category
// in, so "Techno" on its own means techno festivals, not every wedding too.
// With nothing picked, the profile's interests are the default. Empty means
// every category.
export function typesInScope(types, details, interests = []) {
  const fromDetails = details.map(categoryOfDetail).filter(Boolean)
  const picked = [...new Set([...types, ...fromDetails])]
  return picked.length ? picked : interests
}

// The region the feed starts from: your favorites once you have some.
export function defaultRegion(favoriteRegions) {
  return favoriteRegions.length ? "mine" : "all"
}

// A region picked in the sheet, or the default while none is (null).
export function regionInEffect(activeRegion, favoriteRegions) {
  return activeRegion ?? defaultRegion(favoriteRegions)
}

// What the active-filter row shows: every filter that is on, in the order the
// sheet lists them, each with the kind of filter that removing it clears. The
// defaults from the profile are just the feed, so they are not filters: a
// region shows only once picked over the default (null).
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

export function visibleEvents(
  allEvents,
  {
    query = "",
    types = [],
    details = [],
    interests = [],
    region = "all",
    period: periodId = "all",
    favoriteRegions = [],
  } = {},
) {
  const q = query.trim().toLowerCase()
  const period = periods.find((p) => p.id === periodId) ?? periods[FIRST_INDEX]
  const scope = typesInScope(types, details, interests)
  // A category with no style or genre picked shows all of its events.
  const detailCategories = new Set(details.map(categoryOfDetail))
  return allEvents.filter((event) => {
    const matchesType = !scope.length || scope.includes(event.category)
    const matchesDetail =
      !detailCategories.has(event.category) ||
      details.includes(event.filterValue)
    const matchesRegion =
      region === "all" ||
      (region === "mine"
        ? favoriteRegions.some((favorite) => sameRegion(favorite, event.region))
        : sameRegion(event.region, region))
    const matchesPeriod =
      period.days === null ||
      (event.eventInDays >= TODAY && event.eventInDays <= period.days)
    const matchesQuery =
      q === "" ||
      event.title.toLowerCase().includes(q) ||
      event.subtitle.toLowerCase().includes(q)
    return (
      matchesType &&
      matchesDetail &&
      matchesRegion &&
      matchesPeriod &&
      matchesQuery
    )
  })
}

export function sortEvents(events, sortId = DEFAULT_SORT) {
  const list = [...events]
  switch (sortId) {
    case "event_date_desc":
      return list.sort((a, b) => compareField(a, b, "event_date", false))
    case "event_date_asc":
      return list.sort((a, b) => compareField(a, b, "event_date", true))
    case "deadline_desc":
      return list.sort((a, b) =>
        compareField(a, b, "application_deadline", false),
      )
    case "created_asc":
      return list.sort((a, b) => compareField(a, b, "created_at", true))
    case "deadline_asc":
      return list.sort((a, b) =>
        compareField(a, b, "application_deadline", true),
      )
    case "created_desc":
    default:
      return list.sort((a, b) => compareField(a, b, "created_at", false))
  }
}

function compareField(a, b, field, ascending) {
  const left = a[field] ?? ""
  const right = b[field] ?? ""
  const order = String(left).localeCompare(String(right))
  if (order !== SAME_ORDER) return ascending ? order : -order
  return String(a.id).localeCompare(String(b.id))
}
