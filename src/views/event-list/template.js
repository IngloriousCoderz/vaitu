import instantMixOutline from "@iconify-icons/material-symbols/instant-mix-outline"
import searchOutline from "@iconify-icons/material-symbols/search-outline"
import settingsOutline from "@iconify-icons/material-symbols/settings-outline"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Dialog } from "@inglorious/ui/dialog"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { ref } from "@inglorious/web/directives/ref"
import { when } from "@inglorious/web/directives/when"

import { Card } from "../../common/event-card/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { LIST_STAGGER_CAP } from "../../constants/index.js"
import { t, translatedLabel } from "../../i18n/index.js"
import { DEFAULT_SORT } from "./helpers.js"
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
    // How many events the filters match, of which `events` are the pages
    // loaded so far.
    entity.total ??= 0
    entity.isLoadingMore ??= false
    // The latest page and regions requests: answers to older ones are dropped.
    entity.request ??= 0
    entity.regionsRequest ??= 0
    // Every region the feed could show an event in, as stored.
    entity.regions ??= []
    entity.appliedMap ??= {}
    entity.favoriteRegions ??= []
    entity.interests ??= []
    entity.status ??= "loading"
    entity.error ??= null
  },

  render(props, api) {
    return this.renderEventList(props, api)
  },

  renderEventList(
    {
      events,
      total,
      isLoadingMore,
      appliedMap,
      status,
      error,
      category,
      types,
      showTypes,
      sections,
      active,
      regions,
      periods,
      query,
      activeTypes,
      activeDetails,
      activeRegion,
      activePeriod,
      isFiltersVisible,
      onSearch,
      onToggleType,
      onToggleDetail,
      onRemoveFilter,
      onCloseFilters,
      onSelectRegion,
      onOpenPreferences,
      onSelectPeriod,
      onClearFilters,
      onOpenEvent,
      onPageMore,
    },
    api,
  ) {
    const hasMore = status === "ready" && events.length < total
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
          ${Dialog.render({
            id: "filters",
            isOpen: isFiltersVisible,
            // A sheet rising from the bottom on a phone, a dialog above.
            variant: "sheet",
            closeLabel: t("common.close"),
            title: html`<span class=${styles.dialogTitle}>
              ${t("events.filters")}
              ${IconButton.render({
                icon: Icon.render({ icon: settingsOutline, size: "lg" }),
                ariaLabel: t("events.feedPreferences"),
                variant: "ghost",
                color: "secondary",
                shape: "round",
                onClick: onOpenPreferences,
              })}
            </span>`,
            onClose: onCloseFilters,
            children: html`
              ${when(
                showTypes,
                () => html`
                  <h3 class=${styles.filterTitle}>${t("events.type")}</h3>
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
                  <h3 class=${styles.filterTitle}>${section.title}</h3>
                  ${this.renderChipRow({
                    items: section.options,
                    isActive: (option) => activeDetails.includes(option.id),
                    onSelect: onToggleDetail,
                    getLabel: (option) => option.label,
                  })}
                `,
              )}
              <h3 class=${styles.filterTitle}>${t("events.region")}</h3>
              ${this.renderChipRow({
                items: regions,
                isActive: (region) => region.id === activeRegion,
                onSelect: onSelectRegion,
                getLabel: translatedLabel,
              })}
              <h3 class=${styles.filterTitle}>${t("events.period")}</h3>
              ${this.renderChipRow({
                items: periods,
                isActive: (period) => period.id === activePeriod,
                onSelect: onSelectPeriod,
                getLabel: (period) => period.label,
              })}
            `,
            actions: Button.render({
              children: t("events.clearAll"),
              variant: "ghost",
              onClick: onClearFilters,
            }),
          })}
          ${when(showResultsBar, () =>
            Flex.render({
              align: "center",
              justify: "between",
              gap: "sm",
              wrap: "nowrap",
              className: styles.resultsBar,
              children: [
                html`<p class=${styles.resultsCount}>
                  ${t("events.results", { count: total })}
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
                isEmpty: !events.length,
                emptyText: t("events.noneMatch"),
              }) ??
              events.map((event, index) =>
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
          ${when(
            hasMore,
            () => html`
              <div
                class=${styles.listEnd}
                role="status"
                ${watchEnd(onPageMore)}
              >
                ${when(isLoadingMore, () => t("common.loading"))}
              </div>
            `,
          )}
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
          shape: "round",
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
  // them all off. Region and period stop hiding in the dialog once set.
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

// Calls `onVisible` when the element comes within a screen of the viewport,
// to load the next page before the list runs out. It observes again on every
// render: a page too short to push the element away would otherwise never be
// reported again, since the observer only reports changes.
const observers = new WeakMap()

function watchEnd(onVisible) {
  return ref((element) => {
    if (!element) return
    element.onVisible = onVisible
    let observer = observers.get(element)
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) entry.target.onVisible?.()
          }
        },
        { rootMargin: "100% 0px" },
      )
      observers.set(element, observer)
    }
    observer.unobserve(element)
    observer.observe(element)
  })
}
