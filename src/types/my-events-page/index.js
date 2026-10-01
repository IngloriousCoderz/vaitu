import * as handlers from "./handlers.js"
import { renderMyEvents } from "./template.js"

const { loadMyEvents, removeEvent, ...syncHandlers } = handlers

export const MyEventsPage = {
  ...syncHandlers,
  ...loadMyEvents,
  ...removeEvent,
  render(entity, api) {
    const id = entity.id
    return renderMyEvents({
      entity,
      onOpenEvent: (event_id) => api.notify("#received:open", event_id),
      onEdit: (event_id) =>
        api.notify("#create_event:open", { event_id }),
      onAskDelete: (event_id) => api.notify(`#${id}:askDelete`, event_id),
      onDelete: (event_id) => api.notify(`#${id}:removeEvent`, event_id),
      onCancelDelete: () => api.notify(`#${id}:cancelDelete`),
    })
  },
}
