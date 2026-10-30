import { Button } from "@inglorious/ui/button"
import { Snackbar } from "@inglorious/ui/snackbar"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

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
