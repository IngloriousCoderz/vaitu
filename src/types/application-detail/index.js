import { Capacitor } from "@capacitor/core"
import { Share } from "@capacitor/share"
import { Form } from "@inglorious/web/form"

import { uploadIcsFile } from "../../api/applications.js"
import {
  activateRealtime,
  deactivateRealtime,
  realtimeColumn,
} from "../../realtime.js"
import * as handlers from "./handlers.js"
import { ApplicationDetail as renderers } from "./template.js"

const { applicationLoad, save, withdraw, giveUp, ...syncHandlers } = handlers

export const ApplicationDetail = {
  ...Form,
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
    entity.initialValues = { motivation: "" }
    Form.create(entity)
    entity.isConfirmingWithdraw ??= false
    entity.isConfirmingGiveUp ??= false
    entity.status ??= "idle"
    entity.error ??= null
    activateRealtime(entity.id, {
      table: "applications",
      event: `#${entity.id}:applicationLoad`,
      payload: (state) => state[entity.id].application_id,
      match: (change, state) => {
        const applicationId = state[entity.id]?.application_id
        return (
          applicationId != null &&
          realtimeColumn(change, "id") === applicationId
        )
      },
    })
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
  },

  saveSubmit(entity, _, api) {
    Form.validate(entity, { validate: validateMotivation })
    if (!entity.isValid) return
    entity.error = null
    api.notify(`#${entity.id}:save`, {
      application_id: entity.application_id,
      motivation: entity.values.motivation,
    })
  },

  render(entity, api) {
    const id = entity.id
    return this.renderApplicationDetail({
      entity,
      onField: ({ field, value }) =>
        api.notify(`#${id}:fieldSet`, { field, value }),
      onSave: () => api.notify(`#${id}:saveSubmit`),
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

function validateMotivation(values) {
  const errors = {}
  if (!(values.motivation ?? "").trim()) {
    errors.motivation = "Motivation is required"
  }
  return errors
}
