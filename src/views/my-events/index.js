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

  create(entity) {
    entity.events ??= []
    entity.confirmingDelete ??= null
    entity.status ??= "idle"
    entity.error ??= null
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
