import * as handlers from "./handlers.js"
import { renderMyEvents } from "./template.js"

const { loadMyEvents, ...syncHandlers } = handlers

export const MyEventsPage = {
  ...syncHandlers,
  ...loadMyEvents,
  render(entity, api) {
    const id = entity.id
    return renderMyEvents({
      entity,
      onNavigate: (value) => {
        if (value === "profile") {
          api.notify(`#${id}:close`)
          api.notify("#profile:open")
        }
      },
    })
  },
}
