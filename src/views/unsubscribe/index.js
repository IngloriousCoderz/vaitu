import { handleRequest } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"
import { t } from "../../i18n/index.js"
import { template } from "./template.js"

const STATUS_NOT_FOUND = 404

const unsubscribe = handleRequest(
  "unsubscribe",
  {
    async run({ token, type }) {
      const query = new URLSearchParams({ token, type })
      const { error } = await supabase.functions.invoke(
        `email-unsubscribe?${query}`,
      )
      if (error) throw error
      return true
    },
  },
  {
    toError: (error) =>
      error?.context?.status === STATUS_NOT_FOUND
        ? "unsubscribe.linkExpired"
        : "unsubscribe.failed",
  },
)

export const Unsubscribe = {
  ...unsubscribe,
  ...template,

  create(entity) {
    entity.status = "idle"
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
