import { Button } from "@inglorious/ui/button"
import { Snackbar } from "@inglorious/ui/snackbar"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

// The pill that greets the sign-in that brought a deactivated account back,
// saying what did not come back with it. Dismissed with its own button rather
// than the Snackbar's close, whose label is not translated.
export const ReactivatedBar = {
  render({ onDismiss }) {
    return Snackbar.render({
      isOpen: true,
      position: "bottom-center",
      className: styles.bar,
      message: t("reactivated.message"),
      action: Button.render({
        children: t("reactivated.dismiss"),
        variant: "primary",
        shape: "pill",
        size: "sm",
        onClick: onDismiss,
      }),
    })
  },
}
