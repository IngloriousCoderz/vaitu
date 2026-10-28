import addOutline from "@iconify-icons/material-symbols/add-outline"
import { Fab as IwFab } from "@inglorious/ui/fab"
import { Icon } from "@inglorious/ui/icon"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

const LIFTS = [null, styles.fabOverOnePill, styles.fabOverTwoPills]

// Creates an event, on a phone only: from tablet up the app bar has the New
// event button. Everything but placement comes from the package.
export const Fab = {
  render({ pillCount, onClick }) {
    return IwFab.render({
      children: Icon.render({ icon: addOutline, size: "lg" }),
      color: "primary",
      ariaLabel: t("nav.newEvent"),
      // Rises over the pills (update, push prompt) rather than under them.
      className: [styles.fab, LIFTS[pillCount]].filter(Boolean).join(" "),
      onClick,
    })
  },
}
