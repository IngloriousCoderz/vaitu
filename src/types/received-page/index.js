import * as handlers from "./handlers.js"
import { renderReceived } from "./template.js"

const { loadReceived, setStatus, ...syncHandlers } = handlers

export const ReceivedPage = {
  ...syncHandlers,
  ...loadReceived,
  ...setStatus,
  render(entity, api) {
    const id = entity.id
    return renderReceived({
      entity,
      onSelect: (application_id) =>
        api.notify(`#${id}:setStatus`, {
          application_id,
          status: "selected",
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
    })
  },
}
