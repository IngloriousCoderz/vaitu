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
    entity.interested_categories ??= []
    entity.favorite_regions ??= []
    entity.is_email_opted_out ??= false
    entity.favoriteInput ??= ""
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
        onToggleInterest: (categoryId) =>
          api.notify(`#${id}:interestToggle`, categoryId),
        onFavoriteInput: (value) =>
          api.notify(`#${id}:favoriteInputSet`, value),
        onFavoriteAdd: (value) => api.notify(`#${id}:favoriteAdd`, value),
        onFavoriteRemove: (value) => api.notify(`#${id}:favoriteRemove`, value),
        onEmails: (isReceiving) => api.notify(`#${id}:emailsSet`, isReceiving),
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
  entity.favoriteInput = ""
  entity.saveError = null
}
