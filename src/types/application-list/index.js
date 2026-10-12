import { activateRealtime, deactivateRealtime } from "../../realtime.js"
import * as handlers from "./handlers.js"
import { ApplicationList as renderers } from "./template.js"

const { applicationsLoad, ...syncHandlers } = handlers

export const ApplicationList = {
  ...syncHandlers,
  ...applicationsLoad,
  ...renderers,

  create(entity) {
    entity.isOpen ??= false
    entity.applications ??= []
    entity.status_filter ??= "all"
    entity.status ??= "idle"
    entity.error ??= null
    activateRealtime(entity.id, {
      table: "applications",
      event: `#${entity.id}:applicationsLoad`,
    })
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
  },

  render(entity, api) {
    const id = entity.id
    return this.renderApplicationList({
      entity,
      onOpenEvent: (event_id) => {
        const application = entity.applications.find((a) => a.id === event_id)
        if (application)
          api.notify("#applicationDetail:open", {
            application_id: application.application_id,
            returnTo: "applications",
          })
      },
      onSelectStatus: (status_filter) =>
        api.notify(`#${id}:statusFilterSelect`, status_filter),
    })
  },
}
