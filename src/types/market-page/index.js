import { categories, filtersForCategory } from "./categories.js"
import {
  loadEvents,
  search,
  selectCategory,
  selectFilter,
} from "./handlers.js"
import { renderPage } from "./template.js"

export const MarketPage = {
  search,
  selectCategory,
  selectFilter,
  ...loadEvents,
  render(entity, api) {
    const id = entity.id
    return renderPage({
      events: entity.events,
      status: entity.status,
      error: entity.error,
      categories,
      activeCategory: entity.activeCategory,
      filters: filtersForCategory(entity.activeCategory),
      query: entity.query,
      activeFilter: entity.activeFilter,
      onSearch: (value) => api.notify(`#${id}:search`, value),
      onSelectCategory: (categoryId) =>
        api.notify(`#${id}:selectCategory`, categoryId),
      onSelectFilter: (filterId) => api.notify(`#${id}:selectFilter`, filterId),
      onOpenEvent: (eventId) => api.notify("#detail:open", eventId),
    })
  },
}
