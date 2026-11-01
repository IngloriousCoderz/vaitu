import { debounce } from "@inglorious/utils/function"

import {
  interestsFor,
  jobTypeById,
  professions,
} from "../../data/event-taxonomy.js"
import { regionFilterItems } from "../../data/regions/resolve.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { filterSections } from "./categories.js"
import {
  detailToggle,
  filtersClear,
  filtersClose,
  filtersToggle,
  jobTypesSet,
  load,
  pageFetch,
  pageMore,
  periodSelect,
  professionToggle,
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
  jobTypesInScope,
  periods,
  professionsInScope,
  regionInEffect,
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
  jobTypesSet,
  professionToggle,
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
    const inScope = professionsInScope(
      entity.activeProfessions,
      entity.professions,
    )
    const interests = interestsFor(entity.interests, inScope)
    const scope = jobTypesInScope(
      entity.activeTypes,
      entity.activeDetails,
      entity.interests,
      inScope,
    )
    const settings = [
      ...new Set(scope.map((id) => jobTypeById(id)?.category).filter(Boolean)),
    ]
    const [onlySetting, ...otherSettings] = settings
    return this.renderEventList(
      {
        events: entity.events,
        total: entity.total,
        isLoadingMore: entity.isLoadingMore,
        appliedMap: entity.appliedMap,
        status: entity.status,
        error: entity.error,
        category: otherSettings.length ? undefined : onlySetting,
        showTypes: interests.length !== ONE_INTEREST,
        professions,
        activeProfessions: entity.activeProfessions,
        sections: filterSections(settings),
        active: filtersOn(entity),
        regions: regionsOf(entity),
        periods,
        query: entity.query,
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
        onToggleProfession: (professionId) =>
          api.notify(`#${id}:professionToggle`, professionId),
        onToggleDetail: (value) => api.notify(`#${id}:detailToggle`, value),
        onRemoveFilter: ({ kind, id: value }) => {
          if (kind === "type") api.notify(`#${id}:typeToggle`, value)
          if (kind === "profession") {
            api.notify(`#${id}:professionToggle`, value)
          }
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
    professions: entity.activeProfessions,
    details: entity.activeDetails,
    region: entity.activeRegion,
    period: entity.activePeriod,
    regions: regionsOf(entity),
  })
}
