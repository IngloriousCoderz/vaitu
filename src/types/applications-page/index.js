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
            returnTo: "applications",
          })
      },
      onSelectStatus: (status_filter) =>
        api.notify(`#${id}:selectStatusFilter`, status_filter),
    })
  },
}
