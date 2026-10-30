import arrowBackOutline from "@iconify-icons/material-symbols/arrow-back-outline"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"

import { t } from "../../i18n/index.js"

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
      shape: "round",
      ariaLabel: t("common.back"),
      onClick: () => api.notify("#router:back", fallback),
    })
  },
}
