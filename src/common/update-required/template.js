import { Button } from "@inglorious/ui/button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { t } from "../../i18n/index.js"
import { Logo } from "../logo/index.js"
import { Page } from "../page/index.js"
import styles from "./style.module.css"

// The whole screen while the installed build is too old: no chrome, no way
// past it, one button to the store. Without a store address (iOS, until the
// App Store id exists) the copy says where to go instead.
export const render = (entity, api) =>
  Page.render({
    variant: "centered",
    align: "center",
    children: html`<div class=${styles.gate}>
      ${Logo.render()}
      <h2 class=${styles.title}>${t("appUpdate.title")}</h2>
      <p class=${styles.subtitle}>
        ${t(entity.storeUrl ? "appUpdate.body" : "appUpdate.bodyNoLink")}
      </p>
      ${when(entity.storeUrl, () =>
        Button.render({
          children: t("appUpdate.update"),
          variant: "primary",
          shape: "pill",
          isFullWidth: true,
          onClick: () => api.notify(`#${entity.id}:storeOpen`),
        }),
      )}
    </div>`,
  })
