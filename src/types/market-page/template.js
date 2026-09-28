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
  query,
  active_filter,
  onSearch,
  onSelectCategory,
  onSelectFilter,
  onOpenEvent,
}) {
  const shown = visibleEvents(events, query, active_category, active_filter)

  return html`
    <div class=${styles.page} data-category=${active_category}>
      <header class=${styles.header}>
        <span class=${styles.logo}>vaitu<span class=${styles.logoDot}>•</span></span>
        <button class=${styles.iconButton} aria-label="Filters" type="button">
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
        <span class=${styles.tab}>
          ${renderIcon({ name: "user" })}
          <span>Seeker</span>
        </span>
      </nav>
    </div>
  `
}
