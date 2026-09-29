import { html } from "@inglorious/web"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Input } from "@inglorious/ui/input"

import { renderCard } from "../event-card/index.js"
import { renderIcon } from "../icon/index.js"
import { renderTabbar } from "../tab-bar/template.js"
import { visibleEvents } from "./helpers.js"
import styles from "./style.module.css"

function renderChipRow({ items, active_id, onSelect, getLabel }) {
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
              color: item.id === active_id ? "primary" : "default",
            })}
          </button>
        `,
      )}
    </div>
  `
}

export function renderPage({
  events,
  applied_map,
  status,
  error,
  categories,
  active_category,
  filters,
  regions,
  periods,
  query,
  active_filter,
  active_region,
  active_period,
  show_filters,
  has_active_filters,
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
    active_category,
    active_filter,
    active_region,
    active_period,
  )

  return html`
    <div class=${styles.page} data-category=${active_category}>
      <header class=${styles.header}>
        <span class=${styles.logo}>vaitu<span class=${styles.logoDot}>•</span></span>
        <button
          class=${has_active_filters
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
        active_id: active_category,
        onSelect: onSelectCategory,
        getLabel: (category) => category.label,
      })}

      ${renderChipRow({
        items: filters,
        active_id: active_filter,
        onSelect: onSelectFilter,
        getLabel: (filter) => filter.label,
      })}

      ${show_filters
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
                  active_id: active_region,
                  onSelect: onSelectRegion,
                  getLabel: (item) => item.label,
                })}
                <h3 class=${styles.sheetTitle}>Period</h3>
                ${renderChipRow({
                  items: periods,
                  active_id: active_period,
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
                    applied: Boolean(applied_map[event.id]),
                    onOpen: onOpenEvent,
                  }),
                )}
      </main>

      ${renderTabbar({ active: "events", onNavigate })}
    </div>
  `
}
