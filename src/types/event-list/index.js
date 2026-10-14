import { activateRealtime, deactivateRealtime } from "../../api/realtime.js"
import { regionFilterItems } from "../../data/regions/resolve.js"
import { categories, filtersForCategory } from "./categories.js"
import {
  categorySelect,
  eventsLoad,
  favoriteChoiceSelect,
  favoriteDraftAdd,
  favoriteDraftInput,
  favoriteDraftRemove,
  favoritesEditCancel,
  favoritesEditStart,
  favoritesSave,
  filtersClear,
  filterSelect,
  filtersToggle,
  periodSelect,
  regionSelect,
  search,
} from "./handlers.js"
import { distinctRegions, periods } from "./helpers.js"
import { EventList as renderers } from "./template.js"

export const EventList = {
  search,
  categorySelect,
  filterSelect,
  periodSelect,
  regionSelect,
  filtersToggle,
  filtersClear,
  favoritesEditStart,
  favoritesEditCancel,
  favoriteDraftInput,
  favoriteChoiceSelect,
  favoriteDraftAdd,
  favoriteDraftRemove,
  ...favoritesSave,
  ...eventsLoad,
  ...renderers,

  create(entity) {
    renderers.create(entity)
    activateRealtime(entity.id, {
      table: "events",
      event: `#${entity.id}:eventsLoad`,
    })
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
  },

  render(entity, api) {
    const id = entity.id
    return this.renderEventList({
      events: entity.events,
      appliedMap: entity.appliedMap,
      status: entity.status,
      error: entity.error,
      categories,
      activeCategory: entity.activeCategory,
      filters: filtersForCategory(entity.activeCategory),
      regions: regionFilterItems(
        distinctRegions(entity.events),
        entity.favoriteRegions,
      ),
      isEditingFavorites: entity.isEditingFavorites,
      favoriteDraft: entity.favoriteDraft,
      favoriteInput: entity.favoriteInput,
      favoritesStatus: entity.favoritesStatus,
      favoritesError: entity.favoritesError,
      periods,
      query: entity.query,
      activeFilter: entity.activeFilter,
      activeRegion: entity.activeRegion,
      activePeriod: entity.activePeriod,
      favoriteRegions: entity.favoriteRegions,
      isFiltersVisible: entity.isFiltersVisible,
      hasActiveFilters:
        entity.activeRegion !== "all" || entity.activePeriod !== "all",
      onSearch: (value) => api.notify(`#${id}:search`, value),
      onSelectCategory: (categoryId) =>
        api.notify(`#${id}:categorySelect`, categoryId),
      onSelectFilter: (filterId) => api.notify(`#${id}:filterSelect`, filterId),
      onToggleFilters: () => api.notify(`#${id}:filtersToggle`),
      onSelectRegion: (region) => api.notify(`#${id}:regionSelect`, region),
      onEditFavorites: () => api.notify(`#${id}:favoritesEditStart`),
      onCancelFavorites: () => api.notify(`#${id}:favoritesEditCancel`),
      onFavoriteInput: (value) =>
        api.notify(`#${id}:favoriteDraftInput`, value),
      onFavoriteAdd: (value) => api.notify(`#${id}:favoriteDraftAdd`, value),
      onFavoriteRemove: (value) =>
        api.notify(`#${id}:favoriteDraftRemove`, value),
      onSaveFavorites: () =>
        api.notify(`#${id}:favoritesSave`, entity.favoriteDraft),
      renderFavoriteChoice: () => api.render("favorite-region-list"),
      onSelectPeriod: (periodId) => api.notify(`#${id}:periodSelect`, periodId),
      onClearFilters: () => api.notify(`#${id}:filtersClear`),
      onOpenEvent: (event_id) => {
        const application_id = entity.appliedMap[event_id]
        if (application_id) {
          api.notify("#applicationDetail:open", {
            application_id,
            returnTo: "events",
          })
        } else {
          api.notify("#eventDetail:open", event_id)
        }
      },
    })
  },
}
