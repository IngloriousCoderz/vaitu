import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { Snackbar } from "@inglorious/ui/snackbar"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

// The permission question as a Snackbar in the shell's tail slot — the same
// component and corner as the update bar, its twin. Two answers live in the
// action slot (Snackbar only has one); `isStacked` parks this pill a rung
// higher while the update bar is actually on screen. Drawer-aware start edge
// and wrapping copy live in the stylesheet.
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
