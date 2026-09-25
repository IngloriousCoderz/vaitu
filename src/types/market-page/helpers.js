export function visibleEvents(allEvents, query, activeCategory, activeFilter) {
  const q = query.trim().toLowerCase()
  return allEvents.filter((event) => {
    const matchesCategory = event.category === activeCategory
    const matchesFilter =
      activeFilter === "all" || event.filterValue === activeFilter
    const matchesQuery =
      q === "" ||
      event.title.toLowerCase().includes(q) ||
      event.subtitle.toLowerCase().includes(q)
    return matchesCategory && matchesFilter && matchesQuery
  })
}
