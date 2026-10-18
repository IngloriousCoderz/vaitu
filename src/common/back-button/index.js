import { IconButton } from "@inglorious/ui/icon-button"
import { MaterialIcon } from "@inglorious/ui/material-icon"

import { t } from "../../i18n/index.js"

// The app bar's back control. It goes back in history when the app has an
// entry of its own to return to, and otherwise to `fallback`: a page opened
// from a shared link or a fresh tab has nothing behind it. The page title
// sits next to it, so the arrow carries no label of its own.
export const BackButton = {
  render({ fallback }, api) {
    return IconButton.render({
      icon: MaterialIcon.render({ name: "arrow_back", size: "lg" }),
      variant: "ghost",
      color: "secondary",
      ariaLabel: t("common.back"),
      onClick: () => api.notify("#router:back", fallback),
    })
  },
}
