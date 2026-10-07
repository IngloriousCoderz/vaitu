import * as handlers from "./handlers.js"
import { subscribeApplications } from "../../api/events.js"
import { renderReceived } from "./template.js"

const { receivedLoad, statusSet, winnerAssign, eventReopen, ...syncHandlers } =
  handlers

export const ReceivedPage = {
  ...syncHandlers,
  ...receivedLoad,
  ...statusSet,
  ...winnerAssign,
  ...eventReopen,
  render(entity, api) {
    const id = entity.id
    if (entity.event_id) {
      subscribeApplications("received", () =>
        api.notify(`#${id}:receivedLoad`, entity.event_id),
      )
    }
    return renderReceived({
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
      onReopen: () =>
        api.notify(`#${id}:eventReopen`, {
          event_id: entity.event_id,
          application_deadline: entity.reopen_deadline || undefined,
        }),
      onCancelReopen: () => api.notify(`#${id}:reopenCancel`),
    })
  },
}
