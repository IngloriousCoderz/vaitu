import { Button } from "@inglorious/ui/button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { Page } from "../../common/page/index.js"
import { ALL_TYPES } from "../../data/notification-types.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

export const template = {
  render(props) {
    return this.renderUnsubscribe(props)
  },

  renderUnsubscribe({ status, error, type, isLinkValid, onUnsubscribe }) {
    const isStopping = status === "loading"
    return Page.render({
      variant: "document",
      read: true,
      children: [
        html`<h1 class=${styles.title}>${t("unsubscribe.title")}</h1>`,
        when(
          status === "success",
          () => html`<p role="status">${t("unsubscribe.done")}</p>`,
          () => html`
            <p class=${styles.question}>${question(type)}</p>
            ${ErrorAlert.render({
              error: isLinkValid ? error : "unsubscribe.linkExpired",
            })}
            ${Button.render({
              children: isStopping
                ? t("unsubscribe.stopping")
                : t("unsubscribe.confirm"),
              color: "primary",
              shape: "pill",
              size: "md",
              isFullWidth: true,
              isDisabled: !isLinkValid || isStopping,
              onClick: onUnsubscribe,
            })}
          `,
        ),
      ],
    })
  },
}

function question(type) {
  if (type === ALL_TYPES) return t("unsubscribe.questionAll")
  return t("unsubscribe.questionType", {
    type: t(`preferences.notifications.types.${type}`, { defaultValue: type }),
  })
}
