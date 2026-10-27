import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { Snackbar } from "@inglorious/ui/snackbar"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

// The permission question, in the same pill and corner as the update bar.
// `isStacked` lifts it above that pill while both are on screen.
export const PushPromptBar = {
  render({ isStacked = false, onAsk, onDecline }) {
    const className = [styles.bar, isStacked && styles.barStacked]
      .filter(Boolean)
      .join(" ")
    return Snackbar.render({
      isOpen: true,
      position: "bottom-center",
      className,
      message: t("push.prompt"),
      action: Flex.render({
        direction: "row",
        align: "center",
        gap: "sm",
        children: [
          Button.render({
            children: t("push.ask"),
            variant: "primary",
            shape: "pill",
            size: "sm",
            onClick: onAsk,
          }),
          Button.render({
            children: t("push.decline"),
            variant: "ghost",
            shape: "pill",
            size: "sm",
            onClick: onDecline,
          }),
        ],
      }),
    })
  },
}
