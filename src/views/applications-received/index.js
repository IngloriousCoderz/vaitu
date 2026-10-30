import { Form } from "@inglorious/web/form"

import { pageRouteChange } from "../../common/page-route.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { clearReopenError } from "./handlers.js"
import { ApplicationsReceived as renderers } from "./template.js"

const { load, statusSet, winnerAssign, eventReopen, ...syncHandlers } = handlers

export const ApplicationsReceived = {
  ...Form,
  ...syncHandlers,
  ...load,
  ...statusSet,
  ...winnerAssign,
  ...eventReopen,
  ...renderers,

  create(entity) {
    entity.event_id ??= null
    entity.event_title ??= ""
    entity.event_status ??= "open"
    entity.event_deadline ??= null
    entity.event_recap ??= null
    entity.initialValues = { reopen_deadline: "" }
    Form.create(entity)
    entity.reopen_deadline ??= ""
    entity.max_applicants ??= 5
    entity.expanded_application_id ??= null
    entity.confirming_assign ??= null
    entity.confirming_reopen ??= false
    entity.photoIndex ??= 0
    entity.isPhotoPreviewOpen ??= false
    entity.items ??= []
    entity.status ??= "idle"
    entity.error ??= null
  },

  routeChange: pageRouteChange(
    open,
    close,
    (payload) => payload.params.eventId,
  ),

  renderHeader(entity) {
    const items = entity.items ?? []
    const shortlisted = items.filter(
      (item) => item.status === "shortlisted",
    ).length
    return {
      title: entity.event_title ?? "",
      subtitle: t("received.summary", {
        shortlisted,
        received: items.length,
      }),
      back: paths.myEvents,
    }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderApplicationsReceived(
      {
        entity,
        onToggle: (application_id) =>
          api.notify(`#${id}:expandToggle`, application_id),
        onSelect: (application_id) =>
          api.notify(`#${id}:statusSet`, {
            application_id,
            status: "shortlisted",
          }),
        onReject: (application_id) =>
          api.notify(`#${id}:statusSet`, {
            application_id,
            status: "rejected",
          }),
        onUnshortlist: (application_id) =>
          api.notify(`#${id}:statusSet`, {
            application_id,
            status: "pending",
          }),
        onUnreject: (application_id) =>
          api.notify(`#${id}:statusSet`, {
            application_id,
            status: "pending",
          }),
        onAskAssign: (application_id) =>
          api.notify(`#${id}:assignAsk`, application_id),
        onAssign: (application_id) =>
          api.notify(`#${id}:winnerAssign`, {
            event_id: entity.event_id,
            application_id,
          }),
        onCancelAssign: () => api.notify(`#${id}:assignCancel`),
        onAskReopen: () => api.notify(`#${id}:reopenAsk`),
        onReopenDeadline: (value) =>
          api.notify(`#${id}:reopenDeadlineSet`, value),
        onReopen: () => api.notify(`#${id}:reopenSubmit`),
        onCancelReopen: () => api.notify(`#${id}:reopenCancel`),
        onPhotoOpen: (index) => api.notify(`#${id}:photoOpen`, index),
        onPhotoClose: () => api.notify(`#${id}:photoClose`),
        onPhotoStep: (delta) => api.notify(`#${id}:photoStep`, delta),
        dir: api.getEntity("i18n").dir,
        onPhotoSwipeStart: (x) => api.notify(`#${id}:photoSwipeStart`, x),
      },
      api,
    )
  },
}

function open(entity, event_id, api) {
  entity.event_id = event_id
  entity.event_title = ""
  entity.event_deadline = null
  entity.event_recap = null
  entity.reopen_deadline = ""
  entity.confirming_reopen = false
  clearReopenError(entity)
  entity.max_applicants = 5
  entity.items = []
  entity.expanded_application_id = null
  entity.confirming_assign = null
  entity.photoIndex = 0
  entity.isPhotoPreviewOpen = false
  api.notify(`#${entity.id}:load`, event_id)
}

function close(entity) {
  entity.event_id = null
  entity.event_title = ""
  entity.event_status = "open"
  entity.event_recap = null
  entity.items = []
  entity.expanded_application_id = null
  entity.confirming_assign = null
  entity.confirming_reopen = false
  entity.reopen_deadline = ""
  entity.photoIndex = 0
  entity.isPhotoPreviewOpen = false
  clearReopenError(entity)
  entity.status = "idle"
  entity.error = null
}
