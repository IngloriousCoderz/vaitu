import { categories, filtersForCategory } from "./categories.js"
import { distinctRegions, periods } from "./helpers.js"
import { initials } from "../profile/helpers.js"
import {
  clearFilters,
  loadEvents,
  search,
  selectCategory,
  selectFilter,
  selectPeriod,
  selectRegion,
  toggleFilters,
} from "./handlers.js"
import { renderPage } from "./template.js"

export const MarketPage = {
  search,
  selectCategory,
  selectFilter,
  selectPeriod,
  selectRegion,
  toggleFilters,
  clearFilters,
  ...loadEvents,
  render(entity, api) {
    const id = entity.id
    const session = api.getEntity("session")
    const profile = api.getEntity("profile")
    const full_name = profile.profile?.full_name
    return renderPage({
      events: entity.events,
      status: entity.status,
      error: entity.error,
      categories,
      active_category: entity.active_category,
      filters: filtersForCategory(entity.active_category),
      regions: distinctRegions(entity.events),
      periods,
      query: entity.query,
      active_filter: entity.active_filter,
      active_region: entity.active_region,
      active_period: entity.active_period,
      show_filters: entity.show_filters,
      has_active_filters:
        entity.active_region !== "all" || entity.active_period !== "all",
      onSearch: (value) => api.notify(`#${id}:search`, value),
      onSelectCategory: (category_id) =>
        api.notify(`#${id}:selectCategory`, category_id),
      onSelectFilter: (filter_id) =>
        api.notify(`#${id}:selectFilter`, filter_id),
      onToggleFilters: () => api.notify(`#${id}:toggleFilters`),
      onSelectRegion: (region) => api.notify(`#${id}:selectRegion`, region),
      onSelectPeriod: (period_id) =>
        api.notify(`#${id}:selectPeriod`, period_id),
      onClearFilters: () => api.notify(`#${id}:clearFilters`),
      onOpenEvent: (event_id) => api.notify("#detail:open", event_id),
      seeker_tab: session?.user_id
        ? {
            initials: initials(full_name),
            label: full_name?.split(" ")[0] ?? "Seeker",
          }
        : null,
      onSeeker: () => {
        const session = api.getEntity("session")
        api.notify(session?.user_id ? "#profile:open" : "#auth:open")
      },
    })
  },
}
