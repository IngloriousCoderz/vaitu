import { html } from "@inglorious/web"

import { renderCard } from "../event-card/index.js"
import { visibleEvents } from "./helpers.js"
import styles from "./style.module.css"

export function renderPage({
  events,
  status,
  error,
  filters,
  query,
  activeFilter,
  onSearch,
  onSelectFilter,
}) {
  const shown = visibleEvents(events, query, activeFilter)

  return html`
    <div class=${styles.page}>
      <header class=${styles.header}>
        <span class=${styles.logo}>vaitu<span class=${styles.logoDot}>•</span></span>
        <button class=${styles.iconButton} aria-label="Filters" type="button">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5.5h14M5.5 10h9M8 14.5h4"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <circle cx="14.5" cy="5.5" r="1.8" fill="currentColor" />
            <circle cx="8" cy="10" r="1.8" fill="currentColor" />
            <circle cx="11" cy="14.5" r="1.8" fill="currentColor" />
          </svg>
        </button>
      </header>

      <div class=${styles.search}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle
            cx="6.5"
            cy="6.5"
            r="4.5"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M10 10l3.2 3.2"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <input
          class=${styles.searchInput}
          type="search"
          placeholder="Find events by city or style..."
          .value=${query}
          @input=${(e) => onSearch(e.target.value)}
        />
      </div>

      <div class=${styles.chips}>
        ${filters.map(
          (filter) => html`
            <button
              type="button"
              class=${filter.id === activeFilter
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
              : shown.map((event) => renderCard({ event }))}
      </main>

      <nav class=${styles.tabbar}>
        <span class=${`${styles.tab} ${styles.tabActive}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 7l1.2-3h9.6L16 7v8a1 1 0 01-1 1H5a1 1 0 01-1-1V7z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path
              d="M7 7a3 3 0 006 0"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>Market</span>
        </span>
        <span class=${styles.tab}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 6.5A1.5 1.5 0 014.5 5h11A1.5 1.5 0 0117 6.5v2a2 2 0 000 4v2a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 14.5v-2a2 2 0 000-4v-2z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path
              d="M13 5v2.2M13 8.9v2.2M13 12.8V15"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-dasharray="0.5 2"
            />
          </svg>
          <span>My Bids</span>
        </span>
        <span class=${styles.tab}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle
              cx="10"
              cy="6.5"
              r="3"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M4 16.5c0-3 2.7-5 6-5s6 2 6 5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>Seeker</span>
        </span>
      </nav>
    </div>
  `
}
