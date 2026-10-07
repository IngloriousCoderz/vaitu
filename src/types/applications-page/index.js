import * as handlers from "./handlers.js"
import { subscribeApplications } from "../../api/events.js"
import { renderApplications } from "./template.js"

const { applicationsLoad, ...syncHandlers } = handlers

export const ApplicationsPage = {
  ...syncHandlers,
  ...applicationsLoad,
  render(entity, api) {
    const id = entity.id
    subscribeApplications("applications", () =>
      api.notify(`#${id}:applicationsLoad`),
    )
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
        api.notify(`#${id}:statusFilterSelect`, status_filter),
    })
  },
}
