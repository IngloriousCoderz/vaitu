import { activateRealtime, deactivateRealtime } from "../../api/realtime.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { ApplicationList as renderers } from "./template.js"

const { applicationsLoad, ...syncHandlers } = handlers

export const ApplicationList = {
  ...syncHandlers,
  ...applicationsLoad,
  ...renderers,

  create(entity) {
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

  // The route is the source of truth for which page is live, so this is where a
  // page opens and loads. Everything else reads the route rather than an
  // `isOpen` flag, which is what used to make app.js a cascade.
  routeChange(entity, payload, api) {
    /* `payload.route`, never `api.getEntity("router").route`. This handler runs
       from inside the router's own notify, and a notification dispatched from a
       handler reads the state as it was before that handler's batch committed —
       so the router entity still named the route we are leaving. That made a
       back navigation look like the page we were on, and open() ran with the new
       route's empty params. The payload is the resolved route and cannot lag. */
    if (payload.route !== entity.id) {
      close(entity)
      return
    }
    open(entity, payload.query.status, api)
  },

  render(entity, api) {
    const id = entity.id
    return this.renderApplicationList({
      entity,
      onOpenEvent: (event_id) => {
        const application = entity.applications.find((a) => a.id === event_id)
        if (application) {
          api.notify(
            "#router:navigate",
            paths.application(application.application_id),
          )
        }
      },
      onSelectStatus: (status_filter) =>
        api.notify(`#${id}:statusFilterSelect`, status_filter),
    })
  },
}

function open(entity, status_filter, api) {
  entity.status_filter = status_filter ?? "all"
  api.notify(`#${entity.id}:applicationsLoad`)
}

function close(entity) {
  entity.status = "idle"
  entity.error = null
}
