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

import { Card } from "../../common/job-card/index.js"
import { LoadStatus } from "../../common/load-status/index.js"
import { Page } from "../../common/page/index.js"
import { LIST_STAGGER_CAP } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { DEFAULT_SORT } from "./helpers.js"
import styles from "./style.module.css"

export const JobList = {
  create(entity) {
    entity.query ??= ""
    entity.activeTypes ??= []
    entity.activeProfessions ??= []
    entity.activeDetails ??= []
    entity.activeRegion ??= null
    entity.activePeriod ??= "all"
    entity.activeSort ??= DEFAULT_SORT
    entity.isFiltersVisible ??= false
    entity.jobs ??= []
    entity.total ??= 0
    entity.isLoadingMore ??= false
    entity.request ??= 0
    entity.regionsRequest ??= 0
    entity.regions ??= []
    entity.appliedMap ??= {}
    entity.favoriteRegions ??= []
    entity.interests ??= []
    entity.professions ??= []
    entity.status ??= "loading"
    entity.error ??= null
  },

  render(props, api) {
    return this.renderJobList(props, api)
  },

  renderJobList(
    {
      jobs,
      total,
      isLoadingMore,
      appliedMap,
      status,
      error,
      category,
      showTypes,
      professions,
      activeProfessions,
      sections,
      active,
      regions,
      periods,
      query,
      activeDetails,
      activeRegion,
      activePeriod,
      isFiltersVisible,
      onSearch,
      onToggleProfession,
      onToggleDetail,
      onRemoveFilter,
      onCloseFilters,
      onSelectRegion,
      onOpenPreferences,
      onSelectPeriod,
      onClearFilters,
      onOpenJob,
      onPageMore,
    },
    api,
  ) {
    const hasMore = status === "ready" && jobs.length < total
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
                placeholder: t("jobs.search"),
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
            variant: "sheet",
            closeLabel: t("common.close"),
            title: html`<span class=${styles.dialogTitle}>
              ${t("jobs.filters")}
              ${IconButton.render({
                icon: Icon.render({ icon: settingsOutline, size: "lg" }),
                ariaLabel: t("jobs.feedPreferences"),
                variant: "ghost",
                color: "secondary",
                shape: "round",
                onClick: onOpenPreferences,
              })}
            </span>`,
            onClose: onCloseFilters,
            children: Flex.render({
              direction: "column",
              gap: "lg",
              children: [
                when(showTypes, () =>
                  this.renderFilterField({
                    title: t("jobs.type"),
                    control: api.render("jobTypesFilter"),
                  }),
                ),
                this.renderFilterField({
                  title: t("jobs.profession"),
                  control: this.renderChipRow({
                    items: professions,
                    isActive: (profession) =>
                      activeProfessions.includes(profession.id),
                    onSelect: onToggleProfession,
                    getLabel: (profession) => t(profession.label),
                  }),
                }),
                ...sections.map((section) =>
                  this.renderFilterField({
                    title: section.title,
                    control: this.renderChipRow({
                      items: section.options,
                      isActive: (option) => activeDetails.includes(option.id),
                      onSelect: onToggleDetail,
                      getLabel: (option) => t(option.label),
                    }),
                  }),
                ),
                this.renderFilterField({
                  title: t("jobs.region"),
                  control: this.renderChipRow({
                    items: regions,
                    isActive: (region) => region.id === activeRegion,
                    onSelect: onSelectRegion,
                    getLabel: (region) => t(region.label),
                  }),
                }),
                this.renderFilterField({
                  title: t("jobs.period"),
                  control: this.renderChipRow({
                    items: periods,
                    isActive: (period) => period.id === activePeriod,
                    onSelect: onSelectPeriod,
                    getLabel: (period) => t(period.label),
                  }),
                }),
              ],
            }),
            actions: Button.render({
              children: t("jobs.clearAll"),
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
                  ${t("jobs.results", { count: total })}
                </p>`,
                html`<div class=${styles.orderBy}>
                  ${api.render("jobsOrderBy")}
                </div>`,
              ],
            }),
          )}
          <main class="${styles.list} vaitu-list">
            ${LoadStatus.render({
              isError: status === "error",
              error,
              isLoading: status === "loading" && !jobs.length,
              isEmpty: !jobs.length,
              emptyText: t("jobs.noneMatch"),
              content: () =>
                jobs.map((job, index) =>
                  Card.render({
                    job,
                    isApplied: Boolean(appliedMap[job.id]),
                    onOpen: onOpenJob,
                    cover: true,
                    className: `vaitu-list-item ${styles.tile}`,
                    style: `--vaitu-list-index:${Math.min(index, LIST_STAGGER_CAP)}`,
                  }),
                ),
            })}
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
            ? t("jobs.filtersOn", { count: filterCount })
            : t("jobs.filters"),
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

  renderActiveRow({ active, onRemoveFilter, onClearFilters }) {
    return html`
      <div class="${styles.chips} ${styles.activeRow}">
        ${active.map(
          (filter) => html`
            <button
              type="button"
              class=${styles.chipButton}
              aria-label=${t("jobs.removeFilter", { label: t(filter.label) })}
              @click=${() => onRemoveFilter(filter)}
            >
              ${Chip.render({
                children: html`${t(filter.label)}
                  <span class=${styles.chipRemove} aria-hidden="true">×</span>`,
                color: "primary",
              })}
            </button>
          `,
        )}
        ${Button.render({
          children: t("jobs.clearAll"),
          variant: "ghost",
          size: "sm",
          className: styles.clearAll,
          onClick: onClearFilters,
        })}
      </div>
    `
  },

  renderFilterField({ title, control }) {
    return Flex.render({
      element: "section",
      direction: "column",
      gap: "sm",
      children: [html`<h3 class=${styles.filterTitle}>${title}</h3>`, control],
    })
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
