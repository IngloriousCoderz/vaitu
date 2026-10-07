import { subscribeEvents } from "../../api/events.js"
import { categories, filtersForCategory } from "./categories.js"
import {
  filtersClear,
  eventsLoad,
  search,
  categorySelect,
  filterSelect,
  periodSelect,
  regionSelect,
  filtersToggle,
} from "./handlers.js"
import { distinctRegions, periods } from "./helpers.js"
import { renderPage } from "./template.js"

export const EventsPage = {
  search,
  categorySelect,
  filterSelect,
  periodSelect,
  regionSelect,
  filtersToggle,
  filtersClear,
  ...eventsLoad,
  render(entity, api) {
    const id = entity.id
    subscribeEvents("events", () => api.notify(`#${id}:eventsLoad`))
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
        api.notify(`#${id}:categorySelect`, categoryId),
      onSelectFilter: (filterId) => api.notify(`#${id}:filterSelect`, filterId),
      onToggleFilters: () => api.notify(`#${id}:filtersToggle`),
      onSelectRegion: (region) => api.notify(`#${id}:regionSelect`, region),
      onSelectPeriod: (periodId) => api.notify(`#${id}:periodSelect`, periodId),
      onClearFilters: () => api.notify(`#${id}:filtersClear`),
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
