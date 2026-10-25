import chevronLeft from "@iconify-icons/material-symbols/chevron-left"
import chevronRight from "@iconify-icons/material-symbols/chevron-right"
import closeIcon from "@iconify-icons/material-symbols/close"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { html } from "@inglorious/web"

import { FIRST_INDEX, MIN_PHOTOS_TO_NAVIGATE } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

const SWIPE_PX = 40
const NEXT_PHOTO = 1
// The counter counts photos from one.
const COUNTER_BASE = 1

// Full-screen look at event photos. Carousel only while enlarged; the X
// (and the solid backdrop) close it. A swipe is told apart from a tap by where
// it began, which the caller keeps (`swipeStartX`, set through `onSwipeStart`).
// In a right-to-left language the photos run the other way: the arrows mirror,
// and a swipe towards the start of the line moves on.
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
            multi
              ? IconButton.render({
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
                })
              : "",
            multi
              ? IconButton.render({
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
                })
              : "",
            multi
              ? html`<div class=${styles.counter} aria-hidden="true">
                  ${safe + COUNTER_BASE}/${total}
                </div>`
              : "",
          ],
        }),
      ],
    })
  },
}
