import { activateRealtime, deactivateRealtime } from "../../api/realtime.js"
import { regionFilterItems } from "../../data/regions/resolve.js"
import { paths } from "../../routes.js"
import { categories, filtersForCategory } from "./categories.js"
import {
  appliedClear,
  categorySelect,
  deleteAsk,
  deleteCancel,
  eventRemove,
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
  ownerSelect,
  periodSelect,
  regionSelect,
  search,
} from "./handlers.js"
import { distinctRegions, owners, periods } from "./helpers.js"
import { EventList as renderers } from "./template.js"

export const EventList = {
  search,
  categorySelect,
  filterSelect,
  ownerSelect,
  periodSelect,
  regionSelect,
  filtersToggle,
  filtersClear,
  appliedClear,
  deleteAsk,
  deleteCancel,
  favoritesEditStart,
  favoritesEditCancel,
  favoriteDraftInput,
  favoriteChoiceSelect,
  favoriteDraftAdd,
  favoriteDraftRemove,
  ...favoritesSave,
  ...eventsLoad,
  ...eventRemove,
  ...renderers,

  create(entity) {
    renderers.create(entity)
    activateRealtime(`${entity.id}:events`, {
      table: "events",
      event: `#${entity.id}:eventsLoad`,
    })
    activateRealtime(`${entity.id}:applications`, {
      table: "applications",
      event: `#${entity.id}:eventsLoad`,
    })
  },

  destroy(entity) {
    deactivateRealtime(`${entity.id}:events`)
    deactivateRealtime(`${entity.id}:applications`)
  },

  render(entity, api) {
    const id = entity.id
    const myEventIds = new Set(entity.myEvents.map((event) => event.id))
    return this.renderEventList({
      events: entity.events,
      myEvents: entity.myEvents,
      myEventIds,
      activeOwner: entity.activeOwner,
      confirmingDelete: entity.confirmingDelete,
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
      owners,
      periods,
      query: entity.query,
      activeFilter: entity.activeFilter,
      activeRegion: entity.activeRegion,
      activePeriod: entity.activePeriod,
      favoriteRegions: entity.favoriteRegions,
      isFiltersVisible: entity.isFiltersVisible,
      hasActiveFilters:
        entity.activeRegion !== "all" || entity.activePeriod !== "all",
      onSelectOwner: (owner) => api.notify(`#${id}:ownerSelect`, owner),
      onEdit: (event_id) =>
        api.notify("#router:navigate", paths.editEvent(event_id)),
      onAskDelete: (event_id) => api.notify(`#${id}:deleteAsk`, event_id),
      onDelete: (event_id) => api.notify(`#${id}:eventRemove`, event_id),
      onCancelDelete: () => api.notify(`#${id}:deleteCancel`),
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
        // Two different destinations from two lists. Your own event leads to the
        // applications you received; anything else leads to the event itself, or
        // to your application on it when there is one.
        if (myEventIds.has(event_id)) {
          api.notify("#router:navigate", paths.receivedApplications(event_id))
          return
        }
        const applicationId = entity.appliedMap[event_id]
        if (applicationId) {
          api.notify("#router:navigate", paths.application(applicationId))
        } else {
          api.notify("#router:navigate", paths.event(event_id))
        }
      },
    })
  },
}
