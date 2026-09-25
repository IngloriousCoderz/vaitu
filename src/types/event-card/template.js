import { html } from "@inglorious/web"

import { deadlineBadge, monogram, thumbGradient } from "./helpers.js"
import styles from "./style.module.css"

// Generic card: renders title/subtitle/tag slots, whatever the category mapped.
export function renderCard({ event, onOpen }) {
  return html`
    <article
      class=${styles.card}
      @click=${onOpen ? () => onOpen(event.id) : null}
    >
      <div class=${styles.thumb} style="background:${thumbGradient(event.hue)}">
        <span class=${styles.monogram}>${monogram(event.title)}</span>
      </div>
      <div class=${styles.body}>
        <div class=${styles.topRow}>
          <h2 class=${styles.couple}>${event.title}</h2>
          <span class=${styles.badge}>${deadlineBadge(event)}</span>
        </div>
        <p class=${styles.meta}>${event.subtitle}</p>
        <span class=${styles.styleChip}>${event.tag}</span>
      </div>
    </article>
  `
}
