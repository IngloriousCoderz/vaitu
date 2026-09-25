import { loadEvents, search, selectFilter } from "./handlers.js"
import { filters } from "./helpers.js"
import { renderPage } from "./template.js"

export const MarketPage = {
  search,
  selectFilter,
  ...loadEvents,
  render(entity, api) {
    const id = entity.id
    return renderPage({
      events: entity.events,
      status: entity.status,
      error: entity.error,
      filters,
      query: entity.query,
      activeFilter: entity.activeFilter,
      onSearch: (value) => api.notify(`#${id}:search`, value),
      onSelectFilter: (filterId) => api.notify(`#${id}:selectFilter`, filterId),
    })
  },
}
