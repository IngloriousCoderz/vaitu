import { Form } from "@inglorious/web/form"

import {
  activateRealtime,
  deactivateRealtime,
  realtimeColumn,
} from "../../api/realtime.js"
import * as handlers from "./handlers.js"
import { ApplicationsReceived as renderers } from "./template.js"

const { receivedLoad, statusSet, winnerAssign, eventReopen, ...syncHandlers } =
  handlers

export const ApplicationsReceived = {
  ...Form,
  ...syncHandlers,
  ...receivedLoad,
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
    entity.items ??= []
    entity.status ??= "idle"
    entity.error ??= null
    activateRealtime(entity.id, {
      table: "applications",
      event: `#${entity.id}:receivedLoad`,
      payload: (state) => state[entity.id].event_id,
      match: (change, state) => {
        const eventId = state[entity.id]?.event_id
        return eventId != null && realtimeColumn(change, "event_id") === eventId
      },
    })
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
  },

  render(entity, api) {
    const id = entity.id
    return this.renderApplicationsReceived({
      entity,
      onToggle: (application_id) =>
        api.notify(`#${id}:expandToggle`, application_id),
      onSelect: (application_id) =>
        api.notify(`#${id}:statusSet`, {
          application_id,
          status: "shortlisted",
          event_id: entity.event_id,
        }),
      onReject: (application_id) =>
        api.notify(`#${id}:statusSet`, {
          application_id,
          status: "rejected",
          event_id: entity.event_id,
        }),
      onUnshortlist: (application_id) =>
        api.notify(`#${id}:statusSet`, {
          application_id,
          status: "pending",
          event_id: entity.event_id,
        }),
      onUnreject: (application_id) =>
        api.notify(`#${id}:statusSet`, {
          application_id,
          status: "pending",
          event_id: entity.event_id,
        }),
      onBack: () => {
        api.notify(`#${id}:close`)
      },
      onAskAssign: (application_id) => {
        api.notify(`#${id}:assignAsk`, application_id)
        requestAnimationFrame(() => {
          document
            .getElementById("assign-confirm")
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        })
      },
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
    })
  },
}
