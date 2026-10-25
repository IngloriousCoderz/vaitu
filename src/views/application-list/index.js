import { activateRealtime, deactivateRealtime } from "../../api/realtime.js"
import { pageRouteChange } from "../../common/page-route.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { ApplicationList as renderers } from "./template.js"

const { load, ...syncHandlers } = handlers

export const ApplicationList = {
  ...syncHandlers,
  ...load,
  ...renderers,

  create(entity, _, api) {
    entity.applications ??= []
    entity.status_filter ??= "all"
    entity.status ??= "idle"
    entity.error ??= null
    activateRealtime(
      entity.id,
      {
        table: "applications",
        event: `#${entity.id}:load`,
      },
      api,
    )
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
  },

  routeChange: pageRouteChange(open, close, (payload) => payload.query.status),

  renderHeader() {
    return { title: t("applications.title") }
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
  api.notify(`#${entity.id}:load`)
}

function close(entity) {
  entity.status = "idle"
  entity.error = null
}
