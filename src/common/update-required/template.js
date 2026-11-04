import { Button } from "@inglorious/ui/button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { t } from "../../i18n/index.js"
import { Logo } from "../logo/index.js"
import { Page } from "../page/index.js"
import styles from "./style.module.css"

export const template = {
  render(props) {
    return this.renderUpdateRequired(props)
  },

  renderUpdateRequired({ storeUrl, onStoreOpen }) {
    return Page.render({
      variant: "centered",
      align: "center",
      children: html`<div class=${styles.gate}>
        ${Logo.render()}
        <h2 class=${styles.title}>${t("appUpdate.title")}</h2>
        <p class=${styles.subtitle}>
          ${t(storeUrl ? "appUpdate.body" : "appUpdate.bodyNoLink")}
        </p>
        ${when(storeUrl, () =>
          Button.render({
            children: t("appUpdate.update"),
            color: "primary",
            shape: "pill",
            isFullWidth: true,
            onClick: onStoreOpen,
          }),
        )}
      </div>`,
    })
  },
}
