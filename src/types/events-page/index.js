import { categories, filtersForCategory } from "./categories.js"
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
import { distinctRegions, periods } from "./helpers.js"
import { renderPage } from "./template.js"

export const EventsPage = {
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
    return renderPage({
      events: entity.events,
      appliedMap: entity.appliedMap,
      status: entity.status,
      error: entity.error,
      categories,
      activeCategory: entity.activeCategory,
      filters: filtersForCategory(entity.activeCategory),
      regions: distinctRegions(entity.events),
      periods,
      query: entity.query,
      activeFilter: entity.activeFilter,
      activeRegion: entity.activeRegion,
      activePeriod: entity.activePeriod,
      isFiltersVisible: entity.isFiltersVisible,
      hasActiveFilters:
        entity.activeRegion !== "all" || entity.activePeriod !== "all",
      onSearch: (value) => api.notify(`#${id}:search`, value),
      onSelectCategory: (categoryId) =>
        api.notify(`#${id}:selectCategory`, categoryId),
      onSelectFilter: (filterId) => api.notify(`#${id}:selectFilter`, filterId),
      onToggleFilters: () => api.notify(`#${id}:toggleFilters`),
      onSelectRegion: (region) => api.notify(`#${id}:selectRegion`, region),
      onSelectPeriod: (periodId) => api.notify(`#${id}:selectPeriod`, periodId),
      onClearFilters: () => api.notify(`#${id}:clearFilters`),
      onOpenEvent: (event_id) => {
        const application_id = entity.appliedMap[event_id]
        if (application_id) {
          api.notify("#application-detail:open", {
            application_id,
            returnTo: "events",
          })
        } else {
          api.notify("#detail:open", event_id)
        }
      },
    })
  },
}
