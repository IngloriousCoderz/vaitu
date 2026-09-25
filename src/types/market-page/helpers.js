export const filters = [
  { id: "all", label: "All Regions" },
  { id: "editorial", label: "Editorial" },
  { id: "documentary", label: "Documentary" },
  { id: "fine_art", label: "Fine Art" },
]

export function visibleEvents(allEvents, query, activeFilter) {
  const q = query.trim().toLowerCase()
  return allEvents.filter((event) => {
    const matchesFilter = activeFilter === "all" || event.style === activeFilter
    const matchesQuery =
      q === "" ||
      event.spouseFirstName1.toLowerCase().includes(q) ||
      event.spouseFirstName2.toLowerCase().includes(q) ||
      event.location.toLowerCase().includes(q)
    return matchesFilter && matchesQuery
  })
}
