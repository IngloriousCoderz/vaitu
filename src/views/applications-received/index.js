import { Form } from "@inglorious/web/form"

import {
  activateRealtime,
  deactivateRealtime,
  realtimeColumn,
} from "../../api/realtime.js"
import { paths } from "../../routes.js"
import { clearReopenError } from "./handlers.js"
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
    // The id is snapshotted because these closures outlive the batch that
    // built them: they fire from a realtime message, by which point the
    // draft this entity was is revoked and reading entity.id throws.
    const id = entity.id
    activateRealtime(id, {
      table: "applications",
      event: `#${id}:receivedLoad`,
      payload: (state) => state[id]?.event_id,
      match: (change, state) => {
        const eventId = state[id]?.event_id
        return eventId != null && realtimeColumn(change, "event_id") === eventId
      },
    })
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
  },

  // The route is the source of truth for which page is live, so this is where a
  // page opens and loads. Everything else reads the route rather than an
  // `isOpen` flag, which is what used to make app.js a cascade.
  routeChange(entity, payload, api) {
    /* `payload.route`, never `api.getEntity("router").route`. This handler runs
       from inside the router's own notify, and a notification dispatched from a
       handler reads the state as it was before that handler's batch committed —
       so the router entity still named the route we are leaving. That made a
       back navigation look like the page we were on, and open() ran with the new
       route's empty params. The payload is the resolved route and cannot lag. */
    if (payload.route !== entity.id) {
      close(entity)
      return
    }
    open(entity, payload.params.eventId, api)
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
        api.notify("#router:navigate", paths.events)
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
  api.notify(`#${entity.id}:receivedLoad`, event_id)
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
  clearReopenError(entity)
  entity.status = "idle"
  entity.error = null
}
