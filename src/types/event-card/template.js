import { html } from "@inglorious/web"

import { coupleName, deadlineBadge, monogram, styleLabel, thumbGradient } from "./helpers.js"
import styles from "./style.module.css"

export function renderCard({ event }) {
  return html`
    <article class=${styles.card}>
      <div class=${styles.thumb} style="background:${thumbGradient(event.hue)}">
        <span class=${styles.monogram}>${monogram(event)}</span>
      </div>
      <div class=${styles.body}>
        <div class=${styles.topRow}>
          <h2 class=${styles.couple}>${coupleName(event)}</h2>
          <span class=${styles.badge}>${deadlineBadge(event)}</span>
        </div>
        <p class=${styles.meta}>${event.location} • ${event.dateLabel}</p>
        <span class=${styles.styleChip}>${styleLabel(event.style)}</span>
      </div>
    </article>
  `
}
