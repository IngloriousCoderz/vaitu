import { Button } from "@inglorious/ui/button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { Page } from "../../common/page/index.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

export const template = {
  render(props) {
    return this.renderEraseAccount(props)
  },

  renderEraseAccount({ status, error, hasToken, onErase }) {
    const isErasing = status === "loading"
    return Page.render({
      variant: "document",
      read: true,
      children: [
        html`<h1 class=${styles.title}>${t("eraseAccount.title")}</h1>`,
        when(
          status === "success",
          () => html`<p role="status">${t("eraseAccount.done")}</p>`,
          () => html`
            <p class=${styles.warning}>${t("eraseAccount.warning")}</p>
            ${ErrorAlert.render({
              error: hasToken ? error : "eraseAccount.linkExpired",
            })}
            ${Button.render({
              children: isErasing
                ? t("eraseAccount.erasing")
                : t("eraseAccount.confirm"),
              color: "error",
              shape: "pill",
              size: "md",
              isFullWidth: true,
              isDisabled: !hasToken || isErasing,
              onClick: onErase,
            })}
          `,
        ),
      ],
    })
  },
}
