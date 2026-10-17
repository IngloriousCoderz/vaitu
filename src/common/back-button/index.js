import { IconButton } from "@inglorious/ui/icon-button"
import { MaterialIcon } from "@inglorious/ui/material-icon"

import styles from "./style.module.css"

// The back control at the top of a detail screen. It goes back in history when
// the app has an entry of its own to return to, and otherwise to `fallback`:
// a page opened from a shared link or a fresh tab has nothing behind it.
export const BackButton = {
  render({ fallback }, api) {
    return IconButton.render({
      icon: MaterialIcon.render({ name: "arrow_back", size: "lg" }),
      label: "Back",
      variant: "ghost",
      color: "secondary",
      className: styles.back,
      onClick: () => api.notify("#router:back", fallback),
    })
  },
}
