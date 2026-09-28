import { html } from "@inglorious/web"

import { renderCard } from "../event-card/index.js"
import { renderIcon } from "../icon/index.js"
import { visibleEvents } from "./helpers.js"
import styles from "./style.module.css"

export function renderPage({
  events,
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
  onSeeker,
  seeker_tab,
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

      <div class=${styles.search}>
        ${renderIcon({ name: "search", size: 15 })}
        <input
          class=${styles.searchInput}
          type="search"
          placeholder="Find events by city, style or genre..."
          .value=${query}
          @input=${(e) => onSearch(e.target.value)}
        />
      </div>

      <div class=${styles.chips}>
        ${categories.map(
          (category) => html`
            <button
              type="button"
              class=${category.id === active_category
                ? `${styles.chip} ${styles.chipActive}`
                : styles.chip}
              @click=${() => onSelectCategory(category.id)}
            >
              ${category.label}
            </button>
          `,
        )}
      </div>

      <div class=${styles.chips}>
        ${filters.map(
          (filter) => html`
            <button
              type="button"
              class=${filter.id === active_filter
                ? `${styles.chip} ${styles.chipActive}`
                : styles.chip}
              @click=${() => onSelectFilter(filter.id)}
            >
              ${filter.label}
            </button>
          `,
        )}
      </div>

      ${show_filters
        ? html`
            <div class=${styles.backdrop} @click=${onToggleFilters}>
              <div
                class=${styles.sheet}
                @click=${(e) => e.stopPropagation()}
              >
                <h3 class=${styles.sheetTitle}>Region</h3>
                <div class=${styles.chips}>
                  <button
                    type="button"
                    class=${active_region === "all"
                      ? `${styles.chip} ${styles.chipActive}`
                      : styles.chip}
                    @click=${() => onSelectRegion("all")}
                  >
                    All regions
                  </button>
                  ${regions.map(
                    (region) => html`
                      <button
                        type="button"
                        class=${region === active_region
                          ? `${styles.chip} ${styles.chipActive}`
                          : styles.chip}
                        @click=${() => onSelectRegion(region)}
                      >
                        ${region}
                      </button>
                    `,
                  )}
                </div>
                <h3 class=${styles.sheetTitle}>Period</h3>
                <div class=${styles.chips}>
                  ${periods.map(
                    (period) => html`
                      <button
                        type="button"
                        class=${period.id === active_period
                          ? `${styles.chip} ${styles.chipActive}`
                          : styles.chip}
                        @click=${() => onSelectPeriod(period.id)}
                      >
                        ${period.label}
                      </button>
                    `,
                  )}
                </div>
                <button
                  class=${styles.clearButton}
                  type="button"
                  @click=${onClearFilters}
                >
                  Clear all
                </button>
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
              : shown.map((event) => renderCard({ event, onOpen: onOpenEvent }))}
      </main>

      <nav class=${styles.tabbar}>
        <span class=${`${styles.tab} ${styles.tabActive}`}>
          ${renderIcon({ name: "bag" })}
          <span>Market</span>
        </span>
        <span class=${styles.tab}>
          ${renderIcon({ name: "ticket" })}
          <span>My Bids</span>
        </span>
        <span class=${styles.tab} @click=${onSeeker}>
          ${seeker_tab
            ? html`
                <span class=${styles.avatarTab}>
                  ${seeker_tab.initials}
                </span>
                <span>${seeker_tab.label}</span>
              `
            : html`
                ${renderIcon({ name: "user" })}
                <span>Seeker</span>
              `}
        </span>
      </nav>
    </div>
  `
}
