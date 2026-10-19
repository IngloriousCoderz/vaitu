import chevronLeft from "@iconify-icons/material-symbols/chevron-left"
import chevronRight from "@iconify-icons/material-symbols/chevron-right"
import closeIcon from "@iconify-icons/material-symbols/close"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { html } from "@inglorious/web"

import { SINGULAR } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

const SWIPE_PX = 40

let touchStartX = 0

// Full-screen look at event photos. Carousel only while enlarged; the X
// (and the solid backdrop) close it.
export const PhotoCarousel = {
  render({ urls, index = 0, open = false, onStep, onClose }) {
    if (!open || !urls?.length) return ""
    const total = urls.length
    const safe = ((index % total) + total) % total
    const multi = total > SINGULAR

    return Flex.render({
      align: "center",
      justify: "center",
      className: styles.backdrop,
      role: "dialog",
      "aria-modal": true,
      "aria-roledescription": "carousel",
      "aria-label": t("common.photoPreview"),
      onClick: onClose,
      children: [
        IconButton.render({
          icon: Icon.render({ icon: closeIcon, size: "lg", color: "#fff" }),
          variant: "ghost",
          shape: "round",
          ariaLabel: t("common.photoClose"),
          className: styles.close,
          onClick: (e) => {
            e.stopPropagation()
            onClose?.()
          },
        }),
        Flex.render({
          align: "center",
          justify: "center",
          className: styles.stage,
          onClick: (e) => e.stopPropagation(),
          ontouchstart: (e) => {
            touchStartX = e.touches[0]?.clientX ?? 0
          },
          ontouchend: (e) => {
            if (!multi || !onStep) return
            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX
            if (Math.abs(dx) < SWIPE_PX) return
            onStep(dx < 0 ? SINGULAR : -SINGULAR)
          },
          children: [
            html`<img
              class=${styles.image}
              src=${urls[safe]}
              alt=""
              draggable="false"
            />`,
            multi
              ? IconButton.render({
                  icon: Icon.render({
                    icon: chevronLeft,
                    size: "lg",
                    color: "#fff",
                  }),
                  variant: "ghost",
                  shape: "round",
                  ariaLabel: t("common.photoPrevious"),
                  className: `${styles.nav} ${styles.prev}`,
                  onClick: () => onStep?.(-SINGULAR),
                })
              : "",
            multi
              ? IconButton.render({
                  icon: Icon.render({
                    icon: chevronRight,
                    size: "lg",
                    color: "#fff",
                  }),
                  variant: "ghost",
                  shape: "round",
                  ariaLabel: t("common.photoNext"),
                  className: `${styles.nav} ${styles.next}`,
                  onClick: () => onStep?.(SINGULAR),
                })
              : "",
            multi
              ? html`<div class=${styles.counter} aria-hidden="true">
                  ${safe + SINGULAR}/${total}
                </div>`
              : "",
          ],
        }),
      ],
    })
  },
}
