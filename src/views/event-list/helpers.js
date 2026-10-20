import { FIRST_INDEX, ZERO } from "../../constants/index.js"
import { sameRegion, uniqueRegions } from "../../data/regions/resolve.js"
import { labelled } from "../../i18n/index.js"

export const owners = [
  labelled("owners.explore", { id: "explore" }),
  labelled("owners.mine", { id: "mine" }),
]

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

export function visibleEvents(
  allEvents,
  query,
  activeCategory,
  activeFilter,
  activeRegion,
  activePeriod,
  favoriteRegions = [],
) {
  const q = query.trim().toLowerCase()
  const period =
    periods.find((p) => p.id === activePeriod) ?? periods[FIRST_INDEX]
  return allEvents.filter((event) => {
    const matchesCategory = event.category === activeCategory
    const matchesFilter =
      activeFilter === "all" || event.filterValue === activeFilter
    const matchesRegion =
      activeRegion === "all" ||
      (activeRegion === "mine"
        ? favoriteRegions.some((favorite) => sameRegion(favorite, event.region))
        : sameRegion(event.region, activeRegion))
    const matchesPeriod =
      period.days === null ||
      (event.eventInDays >= ZERO && event.eventInDays <= period.days)
    const matchesQuery =
      q === "" ||
      event.title.toLowerCase().includes(q) ||
      event.subtitle.toLowerCase().includes(q)
    return (
      matchesCategory &&
      matchesFilter &&
      matchesRegion &&
      matchesPeriod &&
      matchesQuery
    )
  })
}

function compareField(a, b, field, ascending) {
  const left = a[field] ?? ""
  const right = b[field] ?? ""
  const order = String(left).localeCompare(String(right))
  if (order !== ZERO) return ascending ? order : -order
  return String(a.id).localeCompare(String(b.id))
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
