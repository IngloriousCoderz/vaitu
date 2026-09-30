import * as handlers from "./handlers.js"
import { renderMyEvents } from "./template.js"

const { loadMyEvents, ...syncHandlers } = handlers

export const MyEventsPage = {
  ...syncHandlers,
  ...loadMyEvents,
  render(entity, api) {
    return renderMyEvents({
      entity,
      onOpenEvent: (event_id) => api.notify("#received:open", event_id),
      onNavigate: (value) => {
        if (value === "profile") api.notify("#profile:open")
        if (value === "new") api.notify("#create_event:open")
      },
    })
  },
}
