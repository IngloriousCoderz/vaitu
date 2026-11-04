import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"
import { t } from "../../i18n/index.js"
import { template } from "./template.js"

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
  ...template,

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
    return this.renderEraseAccount({
      status: entity.status,
      error: entity.error,
      hasToken: Boolean(token),
      onErase: () => api.notify(`#${entity.id}:erase`, token),
    })
  },
}
