import { html } from "@inglorious/web"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Input } from "@inglorious/ui/input"

import { renderCard } from "../event-card/index.js"
import { renderIcon } from "../icon/index.js"
import { renderTabbar } from "../tab-bar/template.js"
import { visibleEvents } from "./helpers.js"
import styles from "./style.module.css"

function renderChipRow({ items, activeId, onSelect, getLabel }) {
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
              color: item.id === activeId ? "primary" : "default",
            })}
          </button>
        `,
      )}
    </div>
  `
}

export function renderPage({
  events,
  appliedMap,
  status,
  error,
  categories,
  activeCategory,
  filters,
  regions,
  periods,
  query,
  activeFilter,
  activeRegion,
  activePeriod,
  isFiltersVisible,
  hasActiveFilters,
  onSearch,
  onSelectCategory,
  onSelectFilter,
  onToggleFilters,
  onSelectRegion,
  onSelectPeriod,
  onClearFilters,
  onOpenEvent,
  onNavigate,
}) {
  const shown = visibleEvents(
    events,
    query,
    activeCategory,
    activeFilter,
    activeRegion,
    activePeriod,
  )

  return html`
    <div class=${styles.page} data-category=${activeCategory}>
      <header class=${styles.header}>
        <span class=${styles.logo}>vaitu<span class=${styles.logoDot}>•</span></span>
        <button
          class=${hasActiveFilters
            ? `${styles.iconButton} ${styles.iconButtonActive}`
            : styles.iconButton}
          aria-label="Filters"
          type="button"
          @click=${onToggleFilters}
        >
          ${renderIcon({ name: "sliders" })}
        </button>
      </header>

      <div class="vaitu-search">
        ${Input.render({
          inputType: "search",
          isFullWidth: true,
          placeholder: "Find events by city, style or genre...",
          value: query,
          icon: renderIcon({ name: "search", size: 15 }),
          onChange: (value) => onSearch(value),
        })}
      </div>

      ${renderChipRow({
        items: categories,
        activeId: activeCategory,
        onSelect: onSelectCategory,
        getLabel: (category) => category.label,
      })}

      ${renderChipRow({
        items: filters,
        activeId: activeFilter,
        onSelect: onSelectFilter,
        getLabel: (filter) => filter.label,
      })}

      ${isFiltersVisible
        ? html`
            <div class=${styles.backdrop} @click=${onToggleFilters}>
              <div
                class=${styles.sheet}
                @click=${(e) => e.stopPropagation()}
              >
                <h3 class=${styles.sheetTitle}>Region</h3>
                ${renderChipRow({
                  items: [{ id: "all", label: "All regions" }].concat(
                    regions.map((region) => ({ id: region, label: region })),
                  ),
                  activeId: activeRegion,
                  onSelect: onSelectRegion,
                  getLabel: (item) => item.label,
                })}
                <h3 class=${styles.sheetTitle}>Period</h3>
                ${renderChipRow({
                  items: periods,
                  activeId: activePeriod,
                  onSelect: onSelectPeriod,
                  getLabel: (period) => period.label,
                })}
                ${Button.render({
                  children: "Clear all",
                  variant: "ghost",
                  isFullWidth: true,
                  onClick: onClearFilters,
                })}
              </div>
            </div>
          `
        : ""}
      <main class=${styles.list}>
        ${status === "loading"
          ? html`<p class=${styles.empty}>Loading events…</p>`
          : status === "error"
            ? html`<p class=${styles.empty}>${error}</p>`
            : shown.length === 0
              ? html`<p class=${styles.empty}>
                  No events match your search yet.
                </p>`
              : shown.map((event) =>
                  renderCard({
                    event,
                    isApplied: Boolean(appliedMap[event.id]),
                    onOpen: onOpenEvent,
                  }),
                )}
      </main>

      ${renderTabbar({ active: "events", onNavigate })}
    </div>
  `
}
