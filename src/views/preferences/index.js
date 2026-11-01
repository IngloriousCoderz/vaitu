import { pageRouteChange } from "../../common/page-route.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { Preferences as renderers } from "./template.js"

const { load, save, localeSave, ...syncHandlers } = handlers

export const Preferences = {
  ...syncHandlers,
  ...load,
  ...save,
  ...localeSave,
  ...renderers,

  create(entity) {
    entity.interested_job_types ??= []
    entity.professions ??= []
    entity.favorite_regions ??= []
    entity.is_email_opted_out ??= false
    entity.has_new_event_alerts ??= true
    entity.status ??= "idle"
    entity.error ??= null
    entity.saveError ??= null
  },

  routeChange: pageRouteChange(open, close),

  renderHeader() {
    return { title: t("preferences.title"), back: paths.profile }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderPreferences(
      {
        entity,
        onToggleProfession: (professionId) =>
          api.notify(`#${id}:professionToggle`, professionId),
        onEmails: (isReceiving) => api.notify(`#${id}:emailsSet`, isReceiving),
        onNewEventAlerts: (isReceiving) =>
          api.notify(`#${id}:newEventAlertsSet`, isReceiving),
      },
      api,
    )
  },
}

function open(entity, _, api) {
  api.notify(`#${entity.id}:load`)
}

function close(entity) {
  entity.status = "idle"
  entity.saveError = null
}
