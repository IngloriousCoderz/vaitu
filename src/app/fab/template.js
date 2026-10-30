import addOutline from "@iconify-icons/material-symbols/add-outline"
import { Fab as IwFab } from "@inglorious/ui/fab"
import { Icon } from "@inglorious/ui/icon"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

const LIFTS = [null, styles.fabOverOnePill, styles.fabOverTwoPills]

export const Fab = {
  render({ pillCount, onClick }) {
    return IwFab.render({
      children: Icon.render({ icon: addOutline, size: "lg" }),
      color: "primary",
      ariaLabel: t("nav.newEvent"),
      className: [styles.fab, LIFTS[pillCount]].filter(Boolean).join(" "),
      onClick,
    })
  },
}
