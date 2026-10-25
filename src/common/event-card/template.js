import { Badge } from "@inglorious/ui/badge"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { html } from "@inglorious/web"

import { COVER_INDEX } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import {
  deadlineBadge,
  deadlineTone,
  eventSubtitle,
  eventTag,
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
    hero = false,
    className,
    style,
  }) {
    const tone = deadlineTone(event)
    const photo = event.imageUrls?.[COVER_INDEX]
    const cardClass = [
      styles.card,
      divider ? "" : styles.cardFlat,
      cover ? styles.cover : "",
      hero ? styles.hero : "",
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
        <p class=${styles.meta}>${eventSubtitle(event)}</p>
        <div class=${styles.tagRow}>
          ${Chip.render({ children: eventTag(event) })}
          ${
            isApplied
              ? Chip.render({ children: t("card.applied"), color: "success" })
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
          ${
            photo
              ? html`<img class=${styles.thumbImage} src=${photo} alt="" />`
              : html`<span class=${styles.monogram}
                  >${monogram(event.title)}</span
                >`
          }
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
