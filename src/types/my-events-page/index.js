import * as handlers from "./handlers.js"
import { subscribeApplications, subscribeEvents } from "../../api/events.js"
import { renderMyEvents } from "./template.js"

const { eventsLoad, eventRemove, ...syncHandlers } = handlers

export const MyEventsPage = {
  ...syncHandlers,
  ...eventsLoad,
  ...eventRemove,
  render(entity, api) {
    const id = entity.id
    subscribeApplications("my_events", () =>
      api.notify("#my_events:eventsLoad"),
    )
    subscribeEvents("my_events", () => api.notify("#my_events:eventsLoad"))
    return renderMyEvents({
      entity,
      onOpenEvent: (event_id) => api.notify("#received:open", event_id),
      onEdit: (event_id) => api.notify("#create_event:open", { event_id }),
      onAskDelete: (event_id) => api.notify(`#${id}:deleteAsk`, event_id),
      onDelete: (event_id) => api.notify(`#${id}:eventRemove`, event_id),
      onCancelDelete: () => api.notify(`#${id}:deleteCancel`),
    })
  },
}
