import { pageRouteChange } from "@inglorious/web/router"

import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { template } from "./template.js"

const { load, save, unblock, localeSave, ...syncHandlers } = handlers

export const Preferences = {
  ...syncHandlers,
  ...load,
  ...save,
  ...unblock,
  ...localeSave,
  ...template,

  create(entity) {
    entity.interested_job_types ??= []
    entity.professions ??= []
    entity.favorite_regions ??= []
    entity.muted_email_types ??= []
    entity.muted_push_types ??= []
    entity.blocks ??= []
    entity.status ??= "idle"
    entity.error ??= null
    entity.saveError ??= null
  },

  routeChange: pageRouteChange({ open, close }),

  renderHeader() {
    return { title: t("preferences.title"), back: paths.profile }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderPreferences(
      {
        entity,
        isAnalyticsOn: api.getEntity("analytics")?.consent === "granted",
        onToggleProfession: (professionId) =>
          api.notify(`#${id}:professionToggle`, professionId),
        onNotificationToggle: (payload) =>
          api.notify(`#${id}:notificationToggle`, payload),
        onAnalyticsToggle: (isOn) =>
          api.notify("#analytics:analyticsConsent", isOn),
        onUnblock: (user_id) => api.notify(`#${id}:unblock`, user_id),
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
