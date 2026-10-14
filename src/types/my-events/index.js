import { activateRealtime, deactivateRealtime } from "../../api/realtime.js"
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
    activateRealtime(`${entity.id}:applications`, {
      table: "applications",
      event: `#${entity.id}:eventsLoad`,
    })
    activateRealtime(`${entity.id}:events`, {
      table: "events",
      event: `#${entity.id}:eventsLoad`,
    })
  },

  destroy(entity) {
    deactivateRealtime(`${entity.id}:applications`)
    deactivateRealtime(`${entity.id}:events`)
  },

  render(entity, api) {
    const id = entity.id

    return this.renderMyEvents({
      entity,
      onOpenEvent: (event_id) =>
        api.notify("#applicationsReceived:open", event_id),
      onEdit: (event_id) => api.notify("#eventCreate:open", { event_id }),
      onAskDelete: (event_id) => api.notify(`#${id}:deleteAsk`, event_id),
      onDelete: (event_id) => api.notify(`#${id}:eventRemove`, event_id),
      onCancelDelete: () => api.notify(`#${id}:deleteCancel`),
    })
  },
}
