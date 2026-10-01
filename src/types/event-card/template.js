import { Badge } from "@inglorious/ui/badge"
import { Chip } from "@inglorious/ui/chip"
import { html } from "@inglorious/web"

import { deadlineBadge, monogram, thumbGradient } from "./helpers.js"
import styles from "./style.module.css"

// Generic card: renders title/subtitle/tag slots, whatever the category mapped.
export function renderCard({ event, isApplied, onOpen, divider = true }) {
  return html`
    <article
      class=${divider ? styles.card : `${styles.card} ${styles.cardFlat}`}
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
        <div class=${styles.tagRow}>
          ${Chip.render({ children: event.tag })}
          ${
            isApplied
              ? Chip.render({ children: "✓ Applied", color: "success" })
              : ""
          }
        </div>
      </div>
    </article>
  `
}
