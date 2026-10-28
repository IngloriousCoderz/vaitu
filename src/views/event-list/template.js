import instantMixOutline from "@iconify-icons/material-symbols/instant-mix-outline"
import searchOutline from "@iconify-icons/material-symbols/search-outline"
import settingsOutline from "@iconify-icons/material-symbols/settings-outline"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { Card } from "../../common/event-card/index.js"
import { FavoriteRegions } from "../../common/favorite-regions/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { LIST_STAGGER_CAP } from "../../constants/index.js"
import { t, translatedLabel } from "../../i18n/index.js"
import { DEFAULT_SORT, sortEvents, visibleEvents } from "./helpers.js"
import styles from "./style.module.css"

export const EventList = {
  create(entity) {
    entity.query ??= ""
    entity.activeTypes ??= []
    entity.activeDetails ??= []
    // null is the default region, which follows the favorites.
    entity.activeRegion ??= null
    entity.activePeriod ??= "all"
    entity.activeSort ??= DEFAULT_SORT
    entity.isFiltersVisible ??= false
    entity.events ??= []
    entity.appliedMap ??= {}
    entity.favoriteRegions ??= []
    entity.interests ??= []
    entity.isEditingFavorites ??= false
    entity.favoriteDraft ??= []
    entity.favoriteInput ??= ""
    entity.favoritesStatus ??= "idle"
    entity.favoritesError ??= null
    entity.status ??= "loading"
    entity.error ??= null
  },

  render(props, api) {
    return this.renderEventList(props, api)
  },

  renderEventList(
    {
      events,
      appliedMap,
      status,
      error,
      category,
      types,
      showTypes,
      sections,
      active,
      regions,
      isEditingFavorites,
      favoriteDraft,
      favoriteInput,
      favoritesStatus,
      favoritesError,
      periods,
      query,
      activeTypes,
      activeDetails,
      interests,
      activeRegion,
      activePeriod,
      activeSort,
      favoriteRegions,
      isFiltersVisible,
      onSearch,
      onToggleType,
      onToggleDetail,
      onRemoveFilter,
      onToggleFilters,
      onSelectRegion,
      onEditFavorites,
      onCancelFavorites,
      onFavoriteInput,
      onFavoriteAdd,
      onFavoriteRemove,
      onSaveFavorites,
      onSelectPeriod,
      onClearFilters,
      onOpenEvent,
    },
    api,
  ) {
    const shown = sortEvents(
      visibleEvents(events, {
        query,
        types: activeTypes,
        details: activeDetails,
        interests,
        region: activeRegion,
        period: activePeriod,
        favoriteRegions,
      }),
      activeSort,
    )
    const showResultsBar = status === "ready" || status === "saving"

    return Page.render({
      variant: "sticky",
      category,
      wide: true,
      children: [
        html`
          <div class=${styles.stickyTop}>
            <div class="vaitu-search">
              ${Input.render({
                inputType: "search",
                isFullWidth: true,
                placeholder: t("events.search"),
                value: query,
                icon: Icon.render({ icon: searchOutline, size: "lg" }),
                onChange: (value) => onSearch(value),
              })}
            </div>

            ${when(active.length, () =>
              this.renderActiveRow({ active, onRemoveFilter, onClearFilters }),
            )}
          </div>
          ${when(
            isFiltersVisible,
            () => html`
              <div class=${styles.backdrop} @click=${onToggleFilters}>
                <div
                  class="${styles.sheet} vaitu-filter-sheet"
                  @click=${(e) => e.stopPropagation()}
                >
                  ${when(
                    showTypes,
                    () => html`
                      <h3 class=${styles.sheetTitle}>${t("events.type")}</h3>
                      ${this.renderChipRow({
                        items: types,
                        isActive: (type) => activeTypes.includes(type.id),
                        onSelect: onToggleType,
                        getLabel: (type) => type.label,
                      })}
                    `,
                  )}
                  ${sections.map(
                    (section) => html`
                      <h3 class=${styles.sheetTitle}>${section.title}</h3>
                      ${this.renderChipRow({
                        items: section.options,
                        isActive: (option) => activeDetails.includes(option.id),
                        onSelect: onToggleDetail,
                        getLabel: (option) => option.label,
                      })}
                    `,
                  )}
                  <div class=${styles.sheetHeading}>
                    <h3 class=${styles.sheetTitle}>${t("events.region")}</h3>
                    ${IconButton.render({
                      icon: Icon.render({
                        icon: settingsOutline,
                        size: "lg",
                      }),
                      ariaLabel: t("events.editFavorites"),
                      variant: "ghost",
                      color: "secondary",
                      className: styles.sheetGear,
                      onClick: onEditFavorites,
                    })}
                  </div>
                  ${when(isEditingFavorites, () =>
                    this.renderFavoriteEditor(
                      {
                        favoriteDraft,
                        favoriteInput,
                        favoritesStatus,
                        favoritesError,
                        onCancelFavorites,
                        onFavoriteInput,
                        onFavoriteAdd,
                        onFavoriteRemove,
                        onSaveFavorites,
                      },
                      api,
                    ),
                  )}
                  ${this.renderChipRow({
                    items: regions,
                    isActive: (region) => region.id === activeRegion,
                    onSelect: onSelectRegion,
                    getLabel: translatedLabel,
                  })}
                  <h3 class=${styles.sheetTitle}>${t("events.period")}</h3>
                  ${this.renderChipRow({
                    items: periods,
                    isActive: (period) => period.id === activePeriod,
                    onSelect: onSelectPeriod,
                    getLabel: (period) => period.label,
                  })}
                  ${Button.render({
                    children: t("events.clearAll"),
                    variant: "ghost",
                    isFullWidth: true,
                    onClick: onClearFilters,
                  })}
                </div>
              </div>
            `,
          )}
          ${when(showResultsBar, () =>
            Flex.render({
              align: "center",
              justify: "between",
              gap: "sm",
              wrap: "nowrap",
              className: styles.resultsBar,
              children: [
                html`<p class=${styles.resultsCount}>
                  ${t("events.results", { count: shown.length })}
                </p>`,
                html`<div class=${styles.orderBy}>
                  ${api.render("events-order-by")}
                </div>`,
              ],
            }),
          )}
          <main class="${styles.list} vaitu-list">
            ${
              PageStatus.render({
                isError: status === "error",
                error,
                isLoading: status === "loading",
                isEmpty: !shown.length,
                emptyText: t("events.noneMatch"),
              }) ??
              shown.map((event, index) =>
                Card.render({
                  event,
                  isApplied: Boolean(appliedMap[event.id]),
                  onOpen: onOpenEvent,
                  cover: true,
                  className: `vaitu-list-item ${styles.tile}`,
                  style: `--vaitu-list-index:${Math.min(index, LIST_STAGGER_CAP)}`,
                }),
              )
            }
          </main>
        `,
      ],
    })
  },

  renderHeaderActions({ filterCount, onToggleFilters }) {
    return html`
      <span class=${styles.filterButton}>
        ${IconButton.render({
          icon: Icon.render({ icon: instantMixOutline, size: "lg" }),
          variant: "ghost",
          color: "secondary",
          ariaLabel: filterCount
            ? t("events.filtersOn", { count: filterCount })
            : t("events.filters"),
          className: filterCount ? styles.filterActive : "",
          onClick: onToggleFilters,
        })}
        ${when(
          filterCount,
          () =>
            html`<span class=${styles.filterCount} aria-hidden="true"
              >${filterCount}</span
            >`,
        )}
      </span>
    `
  },

  // Each filter that is on, as a chip that turns it off, and a way to turn
  // them all off. Region and period stop hiding in the sheet once set.
  renderActiveRow({ active, onRemoveFilter, onClearFilters }) {
    return html`
      <div class="${styles.chips} ${styles.activeRow}">
        ${active.map(
          (filter) => html`
            <button
              type="button"
              class=${styles.chipButton}
              aria-label=${t("events.removeFilter", { label: filter.label })}
              @click=${() => onRemoveFilter(filter)}
            >
              ${Chip.render({
                children: html`${filter.label}
                  <span class=${styles.chipRemove} aria-hidden="true">×</span>`,
                color: "primary",
              })}
            </button>
          `,
        )}
        ${Button.render({
          children: t("events.clearAll"),
          variant: "ghost",
          size: "sm",
          className: styles.clearAll,
          onClick: onClearFilters,
        })}
      </div>
    `
  },

  renderFavoriteEditor(
    {
      favoriteDraft,
      favoriteInput,
      favoritesStatus,
      favoritesError,
      onCancelFavorites,
      onFavoriteInput,
      onFavoriteAdd,
      onFavoriteRemove,
      onSaveFavorites,
    },
    api,
  ) {
    const saving = favoritesStatus === "saving"
    return html`
      <div class=${styles.favoriteEditor}>
        ${FavoriteRegions.render(
          {
            regions: favoriteDraft ?? [],
            input: favoriteInput ?? "",
            inputId: "list-favorite-region",
            isDisabled: saving,
            onInput: onFavoriteInput,
            onAdd: onFavoriteAdd,
            onRemove: onFavoriteRemove,
            choiceId: "favorite-region-list",
          },
          api,
        )}
        ${ErrorAlert.render({ error: favoritesError })}
        ${Button.render({
          children: saving ? t("common.saving") : t("events.saveRegions"),
          color: "primary",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          isDisabled: saving,
          onClick: onSaveFavorites,
        })}
        ${Button.render({
          children: t("common.cancel"),
          variant: "ghost",
          isFullWidth: true,
          isDisabled: saving,
          onClick: onCancelFavorites,
        })}
      </div>
    `
  },

  renderChipRow({ items, isActive, onSelect, getLabel }) {
    return html`
      <div class=${styles.chips}>
        ${items.map(
          (item) => html`
            <button
              type="button"
              class=${styles.chipButton}
              @click=${() => onSelect(item.id)}
            >
              ${Chip.render({
                children: getLabel(item),
                color: isActive(item) ? "primary" : "default",
              })}
            </button>
          `,
        )}
      </div>
    `
  },
}
