import { activateRealtime, deactivateRealtime } from "../../api/realtime.js"
import { pageRouteChange } from "../../common/page-route.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { deleteAsk, deleteCancel, eventRemove, load } from "./handlers.js"
import { MyEvents as renderers } from "./template.js"

export const MyEvents = {
  deleteAsk,
  deleteCancel,
  ...load,
  ...eventRemove,
  ...renderers,

  create(entity, _, api) {
    entity.events ??= []
    entity.confirmingDelete ??= null
    entity.status ??= "idle"
    entity.error ??= null
    activateRealtime(
      `${entity.id}:events`,
      {
        table: "events",
        event: `#${entity.id}:load`,
      },
      api,
    )
    // The cards count the applications each event received.
    activateRealtime(
      `${entity.id}:applications`,
      {
        table: "applications",
        event: `#${entity.id}:load`,
      },
      api,
    )
  },

  destroy(entity) {
    deactivateRealtime(`${entity.id}:events`)
    deactivateRealtime(`${entity.id}:applications`)
  },

  routeChange: pageRouteChange(open, close),

  renderHeader() {
    return { title: t("myEvents.title") }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderMyEvents({
      entity,
      // Your own event leads to the applications you received.
      onOpenEvent: (event_id) =>
        api.notify("#router:navigate", paths.receivedApplications(event_id)),
      onEdit: (event_id) =>
        api.notify("#router:navigate", paths.editEvent(event_id)),
      onAskDelete: (event_id) => api.notify(`#${id}:deleteAsk`, event_id),
      onDelete: (event_id) => api.notify(`#${id}:eventRemove`, event_id),
      onCancelDelete: () => api.notify(`#${id}:deleteCancel`),
    })
  },
}

function open(entity, _, api) {
  api.notify(`#${entity.id}:load`)
}

function close(entity) {
  entity.confirmingDelete = null
}
