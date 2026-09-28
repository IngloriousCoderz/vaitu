export function visibleEvents(
  all_events,
  query,
  active_category,
  active_filter,
) {
  const q = query.trim().toLowerCase()
  return all_events.filter((event) => {
    const matches_category = event.category === active_category
    const matches_filter =
      active_filter === "all" || event.filter_value === active_filter
    const matches_query =
      q === "" ||
      event.title.toLowerCase().includes(q) ||
      event.subtitle.toLowerCase().includes(q)
    return matches_category && matches_filter && matches_query
  })
}
