import * as handlers from "./handlers.js"
import { renderApplications } from "./template.js"

const { loadApplications, ...syncHandlers } = handlers

export const ApplicationsPage = {
  ...syncHandlers,
  ...loadApplications,
  render(entity, api) {
    const id = entity.id
    return renderApplications({
      entity,
      onOpenEvent: (event_id) => {
        const application = entity.applications.find((a) => a.id === event_id)
        if (application)
          api.notify("#application-detail:open", {
            application_id: application.application_id,
            return_to: "applications",
          })
      },
      onNavigate: (value) => {
        if (value === "events") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
        }
        if (value === "profile") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
          api.notify("#profile:open")
        }
      },
    })
  },
}
