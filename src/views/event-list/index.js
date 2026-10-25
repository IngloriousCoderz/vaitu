import { activateRealtime, deactivateRealtime } from "../../api/realtime.js"
import { regionFilterItems } from "../../data/regions/resolve.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { categories, filtersForCategory } from "./categories.js"
import { withFilterTransition } from "./filter-transition.js"
import {
  appliedClear,
  categorySelect,
  deleteAsk,
  deleteCancel,
  eventRemove,
  favoriteChoiceSelect,
  favoriteDraftAdd,
  favoriteDraftInput,
  favoriteDraftRemove,
  favoritesEditCancel,
  favoritesEditClose,
  favoritesEditStart,
  favoritesSave,
  filtersClear,
  filterSelect,
  filtersToggle,
  load,
  ownerSelect,
  periodSelect,
  regionSelect,
  search,
  sortSelect,
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
  sortSelect,
  filtersToggle,
  filtersClear,
  appliedClear,
  deleteAsk,
  deleteCancel,
  favoritesEditStart,
  favoritesEditCancel,
  favoritesEditClose,
  favoriteDraftInput,
  favoriteChoiceSelect,
  favoriteDraftAdd,
  favoriteDraftRemove,
  ...favoritesSave,
  ...load,
  ...eventRemove,
  ...renderers,

  create(entity, _, api) {
    renderers.create(entity)
    activateRealtime(
      `${entity.id}:events`,
      {
        table: "events",
        event: `#${entity.id}:load`,
      },
      api,
    )
    activateRealtime(
      `${entity.id}:applications`,
      {
        table: "applications",
        event: `#${entity.id}:load`,
      },
      api,
    )
  },

  destroy(entity) {
    deactivateRealtime(`${entity.id}:events`)
    deactivateRealtime(`${entity.id}:applications`)
  },

  // The list is filtered by own events and applied marks, so it reloads for
  // whoever just signed in.
  sessionStart(entity, _, api) {
    api.notify(`#${entity.id}:load`)
  },

  renderHeader(entity, api) {
    return {
      title: t("events.title"),
      isBrand: true,
      actions: this.renderHeaderActions({
        hasActiveFilters:
          entity.activeRegion !== "all" || entity.activePeriod !== "all",
        onToggleFilters: () => api.notify(`#${entity.id}:filtersToggle`),
      }),
    }
  },

  render(entity, api) {
    const id = entity.id
    const myEventIds = new Set(entity.myEvents.map((event) => event.id))
    return this.renderEventList(
      {
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
        activeSort: entity.activeSort,
        favoriteRegions: entity.favoriteRegions,
        isFiltersVisible: entity.isFiltersVisible,
        onSelectOwner: (owner) => api.notify(`#${id}:ownerSelect`, owner),
        onEdit: (event_id) =>
          api.notify("#router:navigate", paths.editEvent(event_id)),
        onAskDelete: (event_id) => api.notify(`#${id}:deleteAsk`, event_id),
        onDelete: (event_id) => api.notify(`#${id}:eventRemove`, event_id),
        onCancelDelete: () => api.notify(`#${id}:deleteCancel`),
        onSearch: (value) => api.notify(`#${id}:search`, value),
        onSelectCategory: (categoryId) =>
          api.notify(`#${id}:categorySelect`, categoryId),
        onSelectFilter: (filterId) =>
          api.notify(`#${id}:filterSelect`, filterId),
        onToggleFilters: () => api.notify(`#${id}:filtersToggle`),
        onSelectRegion: (region) => api.notify(`#${id}:regionSelect`, region),
        onEditFavorites: () => {
          if (entity.isEditingFavorites) return
          withFilterTransition(() => api.notify(`#${id}:favoritesEditStart`))
        },
        onCancelFavorites: () =>
          withFilterTransition(() => api.notify(`#${id}:favoritesEditCancel`)),
        onFavoriteInput: (value) =>
          api.notify(`#${id}:favoriteDraftInput`, value),
        onFavoriteAdd: (value) => api.notify(`#${id}:favoriteDraftAdd`, value),
        onFavoriteRemove: (value) =>
          api.notify(`#${id}:favoriteDraftRemove`, value),
        onSaveFavorites: () =>
          api.notify(`#${id}:favoritesSave`, entity.favoriteDraft),
        onSelectPeriod: (periodId) =>
          api.notify(`#${id}:periodSelect`, periodId),
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
      },
      api,
    )
  },
}
