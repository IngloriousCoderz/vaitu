import { Snackbar } from "@inglorious/ui/snackbar"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

export const OfflineBar = {
  render() {
    return Snackbar.render({
      isOpen: true,
      position: "bottom-center",
      className: styles.bar,
      message: t("offline.message"),
    })
  },
}
