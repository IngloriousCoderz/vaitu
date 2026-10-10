import { subscribeApplications, subscribeEvents } from "../../api/events.js"
import * as handlers from "./handlers.js"
import { MyEvents as renderers } from "./template.js"

const { eventsLoad, eventRemove, ...syncHandlers } = handlers

export const MyEvents = {
  ...syncHandlers,
  ...eventsLoad,
  ...eventRemove,
  ...renderers,

  create(entity) {
    entity.events ??= []
    entity.confirming_delete ??= null
    entity.status ??= "idle"
    entity.error ??= null
  },

  render(entity, api) {
    const id = entity.id

    subscribeApplications("my_events", () => api.notify("#myEvents:eventsLoad"))
    subscribeEvents("my_events", () => api.notify("#myEvents:eventsLoad"))

    return this.renderMyEvents({
      entity,
      onOpenEvent: (event_id) => api.notify("#received:open", event_id),
      onEdit: (event_id) => api.notify("#eventCreate:open", { event_id }),
      onAskDelete: (event_id) => api.notify(`#${id}:deleteAsk`, event_id),
      onDelete: (event_id) => api.notify(`#${id}:eventRemove`, event_id),
      onCancelDelete: () => api.notify(`#${id}:deleteCancel`),
    })
  },
}
