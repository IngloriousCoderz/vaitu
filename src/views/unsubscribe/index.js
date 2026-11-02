import { handleAsync } from "@inglorious/store/async"
import { Button } from "@inglorious/ui/button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { supabase } from "../../api/client.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { Page } from "../../common/page/index.js"
import { ALL_TYPES } from "../../data/notification-types.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

const STATUS_NOT_FOUND = 404

const unsubscribe = handleAsync("unsubscribe", {
  start(entity) {
    entity.status = "stopping"
    entity.error = null
  },
  async run({ token, type }) {
    const query = new URLSearchParams({ token, type })
    const { error } = await supabase.functions.invoke(
      `email-unsubscribe?${query}`,
    )
    if (error) throw error
    return true
  },
  success(entity) {
    entity.status = "done"
  },
  error(entity, err) {
    entity.status = "ready"
    entity.error =
      err?.context?.status === STATUS_NOT_FOUND
        ? "unsubscribe.linkExpired"
        : "unsubscribe.failed"
  },
})

export const Unsubscribe = {
  ...unsubscribe,

  create(entity) {
    entity.status = "ready"
    entity.error = null
  },

  renderHeader() {
    return { title: t("unsubscribe.title") }
  },

  // A page, not an action on arrival: mail scanners follow links in emails.
  render(entity, api) {
    const { token, type } = api.getEntity("router").query ?? {}
    const isStopping = entity.status === "stopping"
    const isLinkValid = Boolean(token && type)
    return Page.render({
      variant: "document",
      read: true,
      children: [
        html`<h1 class=${styles.title}>${t("unsubscribe.title")}</h1>`,
        when(
          entity.status === "done",
          () => html`<p role="status">${t("unsubscribe.done")}</p>`,
          () => html`
            <p class=${styles.question}>${question(type)}</p>
            ${ErrorAlert.render({
              error: isLinkValid ? entity.error : "unsubscribe.linkExpired",
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
              onClick: () =>
                api.notify(`#${entity.id}:unsubscribe`, { token, type }),
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
