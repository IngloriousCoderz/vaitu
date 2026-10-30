import chevronLeft from "@iconify-icons/material-symbols/chevron-left"
import chevronRight from "@iconify-icons/material-symbols/chevron-right"
import closeIcon from "@iconify-icons/material-symbols/close"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { FIRST_INDEX, MIN_PHOTOS_TO_NAVIGATE } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

const SWIPE_PX = 40
const NEXT_PHOTO = 1
const COUNTER_BASE = 1

export const PhotoCarousel = {
  render({
    urls,
    index = FIRST_INDEX,
    isOpen = false,
    swipeStartX = null,
    dir = "ltr",
    onStep,
    onSwipeStart,
    onClose,
  }) {
    if (!isOpen || !urls?.length) return ""
    const total = urls.length
    const safe = ((index % total) + total) % total
    const multi = total >= MIN_PHOTOS_TO_NAVIGATE
    const forward = dir === "rtl" ? -NEXT_PHOTO : NEXT_PHOTO

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
          ontouchstart: (e) => onSwipeStart?.(e.touches[FIRST_INDEX]?.clientX),
          ontouchend: (e) => {
            const endX = e.changedTouches[FIRST_INDEX]?.clientX
            if (!multi || !onStep || endX == null || swipeStartX == null) return
            if (Math.abs(endX - swipeStartX) < SWIPE_PX) return
            onStep(endX < swipeStartX ? forward : -forward)
          },
          children: [
            html`<img
              class=${styles.image}
              src=${urls[safe]}
              alt=""
              draggable="false"
            />`,
            when(multi, () =>
              IconButton.render({
                icon: Icon.render({
                  icon: chevronLeft,
                  size: "lg",
                  direction: dir,
                  color: "#fff",
                }),
                variant: "ghost",
                shape: "round",
                ariaLabel: t("common.photoPrevious"),
                className: `${styles.nav} ${styles.prev}`,
                onClick: () => onStep?.(-NEXT_PHOTO),
              }),
            ),
            when(multi, () =>
              IconButton.render({
                icon: Icon.render({
                  icon: chevronRight,
                  size: "lg",
                  direction: dir,
                  color: "#fff",
                }),
                variant: "ghost",
                shape: "round",
                ariaLabel: t("common.photoNext"),
                className: `${styles.nav} ${styles.next}`,
                onClick: () => onStep?.(NEXT_PHOTO),
              }),
            ),
            when(
              multi,
              () =>
                html`<div class=${styles.counter} aria-hidden="true">
                  ${safe + COUNTER_BASE}/${total}
                </div>`,
            ),
          ],
        }),
      ],
    })
  },
}
