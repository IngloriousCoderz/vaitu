import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"
import { t } from "../../i18n/index.js"
import { template } from "./template.js"

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
  ...template,

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
    return this.renderUnsubscribe({
      status: entity.status,
      error: entity.error,
      type,
      isLinkValid: Boolean(token && type),
      onUnsubscribe: () =>
        api.notify(`#${entity.id}:unsubscribe`, { token, type }),
    })
  },
}
