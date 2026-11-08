import { Badge } from "@inglorious/ui/badge"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { COVER_INDEX } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { formatPay } from "../pay.js"
import {
  deadlineBadge,
  deadlineTone,
  jobMonogram,
  jobSubtitle,
  jobTag,
  jobTypeLabel,
  thumbGradient,
} from "./helpers.js"
import styles from "./style.module.css"

const toneClass = {
  closing: styles.badgeClosing,
  closed: styles.badgeClosed,
}

export const Card = {
  render({
    job,
    isApplied,
    onOpen,
    divider = true,
    cover = false,
    hero = false,
    className,
    style,
  }) {
    const tone = deadlineTone(job)
    const photo = job.imageUrls?.[COVER_INDEX]
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
          <h2 class=${styles.couple}>${job.title}</h2>
          ${Badge.render({
            children: deadlineBadge(job),
            color: tone === "assigned" ? "success" : undefined,
            shape: "pill",
            className: [styles.badge, toneClass[tone]]
              .filter(Boolean)
              .join(" "),
          })}
        </div>
        <p class=${styles.meta}>${jobSubtitle(job)}</p>
        <div class=${styles.tagRow}>
          ${Chip.render({ children: jobTypeLabel(job) })}
          ${when(job.filterValues.length, () => Chip.render({ children: jobTag(job) }))}
          ${when(job.pay && job.pay.kind !== "to_agree", () =>
            Chip.render({ children: formatPay(job.pay), color: "info" }),
          )}
          ${when(isApplied, () =>
            Chip.render({ children: t("card.applied"), color: "success" }),
          )}
        </div>
      `,
    ]

    return html`
      <article
        class=${cardClass}
        style=${style}
        data-category=${job.category}
        @click=${onOpen ? () => onOpen(job.id) : null}
      >
        <div class=${styles.thumb} style="background:${thumbGradient(job.hue)}">
          ${when(
            photo,
            () => html`<img class=${styles.thumbImage} src=${photo} alt="" />`,
            () =>
              html`<span class=${styles.monogram}>${jobMonogram(job)}</span>`,
          )}
        </div>
        ${when(
          cover,
          () =>
            Flex.render({
              direction: "column",
              className: styles.body,
              children: body,
            }),
          () => html`<div class=${styles.body}>${body}</div>`,
        )}
      </article>
    `
  },
}

export {
  deadlineBadge,
  deadlineTone,
  jobMonogram,
  jobSubtitle,
  jobTag,
  jobTypeLabel,
  thumbGradient,
} from "./helpers.js"
