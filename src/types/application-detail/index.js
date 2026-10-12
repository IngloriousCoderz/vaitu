import { Capacitor } from "@capacitor/core"
import { Share } from "@capacitor/share"

import { uploadIcsFile } from "../../api/applications.js"
import * as handlers from "./handlers.js"
import { ApplicationDetail as renderers } from "./template.js"

const { applicationLoad, save, withdraw, giveUp, ...syncHandlers } = handlers

export const ApplicationDetail = {
  ...syncHandlers,
  ...applicationLoad,
  ...save,
  ...withdraw,
  ...giveUp,
  ...renderers,

  create(entity) {
    entity.application_id ??= null
    entity.returnTo ??= null
    entity.application ??= null
    entity.motivation ??= ""
    entity.isConfirmingWithdraw ??= false
    entity.isConfirmingGiveUp ??= false
    entity.status ??= "idle"
    entity.error ??= null
  },

  render(entity, api) {
    const id = entity.id
    return this.renderApplicationDetail({
      entity,
      onField: ({ field, value }) =>
        api.notify(`#${id}:fieldSet`, { field, value }),
      onSave: () =>
        api.notify(`#${id}:save`, {
          application_id: entity.application_id,
          motivation: entity.motivation,
        }),
      onAskWithdraw: () => api.notify(`#${id}:withdrawAsk`),
      onAskGiveUp: () => api.notify(`#${id}:giveUpAsk`),
      onGiveUp: () => api.notify(`#${id}:giveUp`, entity.application_id),
      onCancelGiveUp: () => api.notify(`#${id}:giveUpCancel`),
      onGoogleCalendar: (url) => window.open(url, "_blank", "noopener"),
      onDownloadIcs: (title, ics) => {
        void (async () => {
          const url = await uploadIcsFile(entity.application_id, ics)
          if (Capacitor.isNativePlatform()) {
            await Share.share({ title, url, dialogTitle: title })
            return
          }
          const link = document.createElement("a")
          link.href = url
          link.download = `${title}.ics`
          document.body.appendChild(link)
          link.click()
          link.remove()
        })().catch(() => {})
      },
      onWithdraw: () => api.notify(`#${id}:withdraw`, entity.application_id),
      onCancelWithdraw: () => api.notify(`#${id}:withdrawCancel`),
      onBack: () => api.notify(`#${id}:back`),
    })
  },
}
