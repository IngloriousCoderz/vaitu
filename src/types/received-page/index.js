import * as handlers from "./handlers.js"
import { renderReceived } from "./template.js"

const { loadReceived, setStatus, assignWinner, reopenEvent, ...syncHandlers } =
  handlers

export const ReceivedPage = {
  ...syncHandlers,
  ...loadReceived,
  ...setStatus,
  ...assignWinner,
  ...reopenEvent,
  render(entity, api) {
    const id = entity.id
    return renderReceived({
      entity,
      onToggle: (application_id) =>
        api.notify(`#${id}:toggleExpand`, application_id),
      onSelect: (application_id) =>
        api.notify(`#${id}:setStatus`, {
          application_id,
          status: "shortlisted",
          event_id: entity.event_id,
        }),
      onReject: (application_id) =>
        api.notify(`#${id}:setStatus`, {
          application_id,
          status: "rejected",
          event_id: entity.event_id,
        }),
      onBack: () => {
        api.notify(`#${id}:close`)
      },
      onAskAssign: (application_id) => {
        api.notify(`#${id}:askAssign`, application_id)
        requestAnimationFrame(() => {
          document
            .getElementById("assign-confirm")
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        })
      },
      onAssign: (application_id) =>
        api.notify(`#${id}:assignWinner`, {
          event_id: entity.event_id,
          application_id,
        }),
      onCancelAssign: () => api.notify(`#${id}:cancelAssign`),
      onAskReopen: () => api.notify(`#${id}:askReopen`),
      onReopen: () => api.notify(`#${id}:reopenEvent`, entity.event_id),
      onCancelReopen: () => api.notify(`#${id}:cancelReopen`),
    })
  },
}
