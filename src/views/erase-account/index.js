import { handleAsync } from "@inglorious/store/async"
import { Button } from "@inglorious/ui/button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { supabase } from "../../api/client.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { Page } from "../../common/page/index.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

const STATUS_NOT_FOUND = 404

const erase = handleAsync("erase", {
  start(entity) {
    entity.status = "erasing"
    entity.error = null
  },
  async run(token) {
    const { error } = await supabase.functions.invoke("erase-account", {
      body: { token },
    })
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
        ? "eraseAccount.linkExpired"
        : "errors.eraseAccount"
  },
})

export const EraseAccount = {
  ...erase,

  create(entity) {
    entity.status = "ready"
    entity.error = null
  },

  renderHeader() {
    return { title: t("eraseAccount.title") }
  },

  // A page, not an action on arrival: mail scanners follow links in emails.
  render(entity, api) {
    const token = api.getEntity("router").query?.token
    const isErasing = entity.status === "erasing"
    return Page.render({
      variant: "document",
      read: true,
      children: [
        html`<h1 class=${styles.title}>${t("eraseAccount.title")}</h1>`,
        when(
          entity.status === "done",
          () => html`<p role="status">${t("eraseAccount.done")}</p>`,
          () => html`
            <p class=${styles.warning}>${t("eraseAccount.warning")}</p>
            ${ErrorAlert.render({
              error: token ? entity.error : "eraseAccount.linkExpired",
            })}
            ${Button.render({
              children: isErasing
                ? t("eraseAccount.erasing")
                : t("eraseAccount.confirm"),
              color: "error",
              shape: "pill",
              size: "md",
              isFullWidth: true,
              isDisabled: !token || isErasing,
              onClick: () => api.notify(`#${entity.id}:erase`, token),
            })}
          `,
        ),
      ],
    })
  },
}
