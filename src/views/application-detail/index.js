import { Capacitor } from "@capacitor/core"
import { Share } from "@capacitor/share"
import { Form } from "@inglorious/web/form"
import { pageRouteChange } from "@inglorious/web/router"

import { uploadIcsFile } from "../../api/applications.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { template } from "./template.js"

const { load, save, withdraw, dealAnswer, dealSettle, ...syncHandlers } =
  handlers

export const ApplicationDetail = {
  ...Form,
  ...syncHandlers,
  ...load,
  ...save,
  ...withdraw,
  ...dealAnswer,
  ...dealSettle,
  ...template,

  create(entity) {
    entity.application_id ??= null
    entity.application ??= null
    entity.initialValues = { motivation: "" }
    Form.create(entity)
    entity.isConfirmingWithdraw ??= false
    entity.isDealBusy ??= false
    entity.dealError ??= null
    entity.status ??= "idle"
    entity.error ??= null
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

  routeChange: pageRouteChange({
    select: (payload) => ({
      application_id: payload.params.applicationId,
    }),
    open,
    close,
  }),

  renderHeader(entity) {
    return { title: entity.application?.title ?? "", back: paths.applications }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderApplicationDetail(
      {
        entity,
        onField: ({ field, value }) =>
          api.notify(`#${id}:fieldSet`, { field, value }),
        onSave: () => api.notify(`#${id}:saveSubmit`),
        onAskWithdraw: () => api.notify(`#${id}:withdrawAsk`),
        onApplyAgain: () =>
          api.notify("#router:navigate", paths.job(entity.application.id)),
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
        onDealAnswer: (isConfirmed) =>
          api.notify(`#${id}:dealAnswer`, {
            application_id: entity.application_id,
            isConfirmed,
          }),
        onDealSettle: (isSettled) =>
          api.notify(`#${id}:dealSettle`, {
            application_id: entity.application_id,
            isSettled,
          }),
        onReportReview: () =>
          api.notify("#safety:safetyOpen", {
            type: "review",
            id: entity.application_id,
          }),
      },
      api,
    )
  },
}

function validateMotivation(values) {
  const errors = {}
  if (!(values.motivation ?? "").trim()) {
    errors.motivation = "validation.motivationRequired"
  }
  return errors
}

function open(entity, { application_id }, api) {
  entity.application_id = application_id
  entity.application = null
  entity.isConfirmingWithdraw = false
  Form.reset(entity)
  api.notify(`#${entity.id}:load`, application_id)
}

function close(entity) {
  entity.application_id = null
  entity.application = null
  entity.status = "idle"
  entity.error = null
  Form.reset(entity)
}
