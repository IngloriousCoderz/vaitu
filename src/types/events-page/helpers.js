export const periods = [
  { id: "all", label: "All dates", days: null },
  { id: "week", label: "Next 7 days", days: 7 },
  { id: "month", label: "Next 30 days", days: 30 },
  { id: "quarter", label: "Next 90 days", days: 90 },
]

export function distinctRegions(all_events) {
  return [...new Set(all_events.map((event) => event.region))].sort()
}

export function visibleEvents(
  all_events,
  query,
  active_category,
  active_filter,
  active_region,
  active_period,
) {
  const q = query.trim().toLowerCase()
  const period = periods.find((p) => p.id === active_period) ?? periods[0]
  return all_events.filter((event) => {
    const matches_category = event.category === active_category
    const matches_filter =
      active_filter === "all" || event.filter_value === active_filter
    const matches_region =
      active_region === "all" || event.region === active_region
    const matches_period =
      period.days === null ||
      (event.event_in_days >= 0 && event.event_in_days <= period.days)
    const matches_query =
      q === "" ||
      event.title.toLowerCase().includes(q) ||
      event.subtitle.toLowerCase().includes(q)
    return (
      matches_category &&
      matches_filter &&
      matches_region &&
      matches_period &&
      matches_query
    )
  })
}
