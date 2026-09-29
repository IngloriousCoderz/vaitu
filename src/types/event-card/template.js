import { html } from "@inglorious/web"
import { Badge } from "@inglorious/ui/badge"
import { Chip } from "@inglorious/ui/chip"

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
          ${Badge.render({ children: deadlineBadge(event), shape: "pill" })}
        </div>
        <p class=${styles.meta}>${event.subtitle}</p>
        ${Chip.render({ children: event.tag })}
      </div>
    </article>
  `
}
