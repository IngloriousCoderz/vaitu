export const periods = [
  { id: "all", label: "All dates", days: null },
  { id: "week", label: "Next 7 days", days: 7 },
  { id: "month", label: "Next 30 days", days: 30 },
  { id: "quarter", label: "Next 90 days", days: 90 },
]

export function distinctRegions(allEvents) {
  return [...new Set(allEvents.map((event) => event.region))].sort()
}

export function visibleEvents(
  allEvents,
  query,
  activeCategory,
  activeFilter,
  activeRegion,
  activePeriod,
) {
  const q = query.trim().toLowerCase()
  const period = periods.find((p) => p.id === activePeriod) ?? periods[0]
  return allEvents.filter((event) => {
    const matchesCategory = event.category === activeCategory
    const matchesFilter =
      activeFilter === "all" || event.filterValue === activeFilter
    const matchesRegion =
      activeRegion === "all" || event.region === activeRegion
    const matchesPeriod =
      period.days === null ||
      (event.eventInDays >= 0 && event.eventInDays <= period.days)
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
