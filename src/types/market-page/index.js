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
      active_category: entity.active_category,
      filters: filtersForCategory(entity.active_category),
      query: entity.query,
      active_filter: entity.active_filter,
      onSearch: (value) => api.notify(`#${id}:search`, value),
      onSelectCategory: (category_id) =>
        api.notify(`#${id}:selectCategory`, category_id),
      onSelectFilter: (filter_id) =>
        api.notify(`#${id}:selectFilter`, filter_id),
      onOpenEvent: (event_id) => api.notify("#detail:open", event_id),
    })
  },
}
