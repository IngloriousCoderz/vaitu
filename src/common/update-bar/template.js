import { Button } from "@inglorious/ui/button"
import { Snackbar } from "@inglorious/ui/snackbar"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

// The pill that rises when a new version lands mid-session: move over now
// with a tap. There is nothing to dismiss — `watchPwaUpdate` in src/pwa.js
// applies it on its own the next time the app goes to the background.
export const UpdateBar = {
  render({ onRefresh }) {
    return Snackbar.render({
      isOpen: true,
      position: "bottom-center",
      className: styles.bar,
      message: t("pwa.updateReady"),
      action: Button.render({
        children: t("pwa.refresh"),
        variant: "primary",
        shape: "pill",
        size: "sm",
        onClick: onRefresh,
      }),
    })
  },
}
