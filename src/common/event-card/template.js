import { Badge } from "@inglorious/ui/badge"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { html } from "@inglorious/web"

import {
  deadlineBadge,
  deadlineTone,
  monogram,
  thumbGradient,
} from "./helpers.js"
import styles from "./style.module.css"

const toneClass = {
  closing: styles.badgeClosing,
  closed: styles.badgeClosed,
}

// Generic card: renders title/subtitle/tag slots, whatever the category mapped.
export const Card = {
  render({
    event,
    isApplied,
    onOpen,
    divider = true,
    cover = false,
    className,
    style,
  }) {
    const tone = deadlineTone(event)
    const cardClass = [
      styles.card,
      divider ? "" : styles.cardFlat,
      cover ? styles.cover : "",
      onOpen ? styles.cardPress : "",
      className,
    ]
      .filter(Boolean)
      .join(" ")
    const body = [
      html`
        <div class=${styles.topRow}>
          <h2 class=${styles.couple}>${event.title}</h2>
          ${Badge.render({
            children: deadlineBadge(event),
            shape: "pill",
            className: tone ? toneClass[tone] : "",
          })}
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
      `,
    ]

    return html`
      <article
        class=${cardClass}
        style=${style}
        @click=${onOpen ? () => onOpen(event.id) : null}
      >
        <div
          class=${styles.thumb}
          style="background:${thumbGradient(event.hue)}"
        >
          <span class=${styles.monogram}>${monogram(event.title)}</span>
        </div>
        ${
          cover
            ? Flex.render({
                direction: "column",
                className: styles.body,
                children: body,
              })
            : html`<div class=${styles.body}>${body}</div>`
        }
      </article>
    `
  },
}
