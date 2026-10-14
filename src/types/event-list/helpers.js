import { FIRST_INDEX, ZERO } from "../../constants/index.js"
import { sameRegion, uniqueRegions } from "../../data/regions/resolve.js"

export const periods = [
  { id: "all", label: "All dates", days: null },
  { id: "week", label: "Next 7 days", days: 7 },
  { id: "month", label: "Next 30 days", days: 30 },
  { id: "quarter", label: "Next 90 days", days: 90 },
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
