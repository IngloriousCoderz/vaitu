import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { Snackbar } from "@inglorious/ui/snackbar"

import styles from "./style.module.css"

export const PromptBar = {
  render({
    message,
    askLabel,
    declineLabel,
    isStacked = false,
    onAsk,
    onDecline,
  }) {
    const className = [styles.bar, isStacked && styles.barStacked]
      .filter(Boolean)
      .join(" ")
    return Snackbar.render({
      isOpen: true,
      position: "bottom-center",
      className,
      message,
      action: Flex.render({
        direction: "row",
        align: "center",
        gap: "sm",
        children: [
          Button.render({
            children: askLabel,
            variant: "primary",
            shape: "pill",
            size: "sm",
            onClick: onAsk,
          }),
          Button.render({
            children: declineLabel,
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
