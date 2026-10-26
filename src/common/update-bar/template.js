import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { html } from "@inglorious/web"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

// The one-row pill that rises when a new version lands mid-session: move over
// now with a tap. There is nothing to dismiss — the update check applies it
// on its own the next time the app goes to the background. `isOverTabbar`
// lifts it clear of the phone's tab bar on the routes that show one.
export const UpdateBar = {
  render({ isOverTabbar, onRefresh }) {
    const className = isOverTabbar
      ? `${styles.bar} ${styles.barOverTabbar}`
      : styles.bar
    return html`<aside class=${className} role="status">
      ${Flex.render({
        direction: "row",
        align: "center",
        gap: "sm",
        className: styles.row,
        children: [
          html`<span class=${styles.message}>${t("pwa.updateReady")}</span>`,
          Button.render({
            children: t("pwa.refresh"),
            variant: "primary",
            shape: "pill",
            size: "sm",
            onClick: onRefresh,
          }),
        ],
      })}
    </aside>`
  },
}
