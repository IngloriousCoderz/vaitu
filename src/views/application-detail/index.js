import { Capacitor } from "@capacitor/core"
import { Share } from "@capacitor/share"
import { Form } from "@inglorious/web/form"

import { uploadIcsFile } from "../../api/applications.js"
import {
  activateRealtime,
  deactivateRealtime,
  realtimeColumn,
} from "../../api/realtime.js"
import { pageRouteChange } from "../../common/page-route.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { ApplicationDetail as renderers } from "./template.js"

const { load, save, withdraw, giveUp, ...syncHandlers } = handlers

export const ApplicationDetail = {
  ...Form,
  ...syncHandlers,
  ...load,
  ...save,
  ...withdraw,
  ...giveUp,
  ...renderers,

  create(entity, _, api) {
    entity.application_id ??= null
    entity.application ??= null
    entity.initialValues = { motivation: "" }
    Form.create(entity)
    entity.isConfirmingWithdraw ??= false
    entity.isConfirmingGiveUp ??= false
    entity.status ??= "idle"
    entity.error ??= null
    // The id is snapshotted because these closures outlive the batch that
    // built them: they fire from a realtime message, by which point the
    // draft this entity was is revoked and reading entity.id throws.
    const id = entity.id
    activateRealtime(
      `${id}:applications`,
      {
        table: "applications",
        event: `#${id}:load`,
        payload: (state) => state[id]?.application_id,
        match: (change, state) => {
          const applicationId = state[id]?.application_id
          return (
            applicationId != null &&
            realtimeColumn(change, "id") === applicationId
          )
        },
      },
      api,
    )
    // The event the application is for: its sender can edit, close or assign
    // it while this page is open.
    activateRealtime(
      `${id}:events`,
      {
        table: "events",
        event: `#${id}:load`,
        payload: (state) => state[id]?.application_id,
        match: (change, state) => {
          const eventId = state[id]?.application?.id
          return eventId != null && realtimeColumn(change, "id") === eventId
        },
      },
      api,
    )
  },

  destroy(entity) {
    deactivateRealtime(`${entity.id}:applications`)
    deactivateRealtime(`${entity.id}:events`)
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

  routeChange: pageRouteChange(open, close, (payload) => ({
    application_id: payload.params.applicationId,
  })),

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
  entity.isConfirmingGiveUp = false
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
