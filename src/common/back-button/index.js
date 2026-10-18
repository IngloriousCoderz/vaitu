import arrowBackOutline from "@iconify-icons/material-symbols/arrow-back-outline"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"

import { t } from "../../i18n/index.js"

// The app bar's back control. It goes back in history when the app has an
// entry of its own to return to, and otherwise to `fallback`: a page opened
// from a shared link or a fresh tab has nothing behind it. The page title
// sits next to it, so the arrow carries no label of its own. It points the
// way back in the reading direction: right, in Arabic.
export const BackButton = {
  render({ fallback }, api) {
    return IconButton.render({
      icon: Icon.render({
        icon: arrowBackOutline,
        size: "lg",
        direction: api.getEntity("i18n").dir,
      }),
      variant: "ghost",
      color: "secondary",
      ariaLabel: t("common.back"),
      onClick: () => api.notify("#router:back", fallback),
    })
  },
}
