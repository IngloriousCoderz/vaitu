import { debounce } from "@inglorious/utils/function"

import { regionFilterItems } from "../../data/regions/resolve.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { categories, filterSections } from "./categories.js"
import {
  detailToggle,
  filtersClear,
  filtersClose,
  filtersToggle,
  load,
  pageFetch,
  pageMore,
  periodSelect,
  regionSelect,
  regionsFetch,
  search,
  searchRun,
  sortSelect,
  typeToggle,
} from "./handlers.js"
import {
  activeFilters,
  distinctRegions,
  periods,
  regionInEffect,
  typesInScope,
} from "./helpers.js"
import { EventList as renderers } from "./template.js"

const ONE_INTEREST = 1
const SEARCH_DELAY_MS = 300

const searchSoon = debounce(
  (api, id) => api.notify(`#${id}:searchRun`),
  SEARCH_DELAY_MS,
)

export const EventList = {
  search,
  searchRun,
  typeToggle,
  detailToggle,
  periodSelect,
  regionSelect,
  sortSelect,
  filtersToggle,
  filtersClose,
  filtersClear,
  pageMore,
  ...load,
  ...pageFetch,
  ...regionsFetch,
  ...renderers,

  create(entity) {
    renderers.create(entity)
  },

  sessionStart(entity, _, api) {
    api.notify(`#${entity.id}:load`)
  },

  renderHeader(entity, api) {
    return {
      title: t("events.title"),
      isBrand: true,
      actions: this.renderHeaderActions({
        filterCount: filtersOn(entity).length,
        onToggleFilters: () => api.notify(`#${entity.id}:filtersToggle`),
      }),
    }
  },

  render(entity, api) {
    const id = entity.id
    const scope = typesInScope(
      entity.activeTypes,
      entity.activeDetails,
      entity.interests,
    )
    const [onlyType, ...otherTypes] = scope
    return this.renderEventList(
      {
        events: entity.events,
        total: entity.total,
        isLoadingMore: entity.isLoadingMore,
        appliedMap: entity.appliedMap,
        status: entity.status,
        error: entity.error,
        category: otherTypes.length ? undefined : onlyType,
        types: categories,
        showTypes: entity.interests.length !== ONE_INTEREST,
        sections: filterSections(scope),
        active: filtersOn(entity),
        regions: regionsOf(entity),
        periods,
        query: entity.query,
        activeTypes: entity.activeTypes,
        activeDetails: entity.activeDetails,
        activeRegion: regionInEffect(
          entity.activeRegion,
          entity.favoriteRegions,
        ),
        activePeriod: entity.activePeriod,
        isFiltersVisible: entity.isFiltersVisible,
        onSearch: (value) => {
          api.notify(`#${id}:search`, value)
          searchSoon(api, id)
        },
        onToggleType: (categoryId) =>
          api.notify(`#${id}:typeToggle`, categoryId),
        onToggleDetail: (value) => api.notify(`#${id}:detailToggle`, value),
        onRemoveFilter: ({ kind, id: value }) => {
          if (kind === "type") api.notify(`#${id}:typeToggle`, value)
          if (kind === "detail") api.notify(`#${id}:detailToggle`, value)
          if (kind === "region") api.notify(`#${id}:regionSelect`, null)
          if (kind === "period") api.notify(`#${id}:periodSelect`, "all")
        },
        onSelectRegion: (region) => api.notify(`#${id}:regionSelect`, region),
        onCloseFilters: () => api.notify(`#${id}:filtersClose`),
        onOpenPreferences: () => {
          api.notify(`#${id}:filtersClose`)
          api.notify("#router:navigate", paths.preferences)
        },
        onSelectPeriod: (periodId) =>
          api.notify(`#${id}:periodSelect`, periodId),
        onClearFilters: () => api.notify(`#${id}:filtersClear`),
        onPageMore: () => api.notify(`#${id}:pageMore`),
        onOpenEvent: (event_id) => {
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

function regionsOf(entity) {
  return regionFilterItems(
    distinctRegions(entity.regions),
    entity.favoriteRegions,
  )
}

function filtersOn(entity) {
  return activeFilters({
    types: entity.activeTypes,
    details: entity.activeDetails,
    region: entity.activeRegion,
    period: entity.activePeriod,
    regions: regionsOf(entity),
  })
}
