import { Form } from "@inglorious/web/form"

import { pageRouteChange } from "../../common/page-route.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { closeAvatarCrop } from "./handlers.js"
import { Profile as renderers } from "./template.js"

const { load, save, accountDeactivate, logout, avatarSave, ...syncHandlers } =
  handlers

export const Profile = {
  ...Form,
  ...syncHandlers,
  ...load,
  ...save,
  ...accountDeactivate,
  ...logout,
  ...avatarSave,
  ...renderers,

  // The tab bar shows the profile on every page, so it loads at sign-in
  // rather than on the first visit to the tab.
  sessionStart(entity, _, api) {
    api.notify(`#${entity.id}:load`)
  },

  create(entity) {
    entity.profile ??= null
    entity.stats ??= null
    entity.isEditing ??= false
    entity.initialValues = {
      full_name: "",
      website: "",
      instagram_handle: "",
      country: "",
      region: "",
    }
    Form.create(entity)
    entity.isConfirmingDeactivate ??= false
    entity.deactivateStatus ??= "idle"
    entity.deactivateError ??= null
    entity.avatarStatus ??= "idle"
    entity.avatarError ??= null
    entity.avatarPreviewUrl ??= null
    entity.isAvatarCropOpen ??= false
    entity.status ??= "idle"
    entity.error ??= null
  },

  routeChange: pageRouteChange(open, close),

  renderHeader() {
    return { title: t("profile.title") }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderProfile(
      {
        entity,
        onCancel: () => api.notify(`#${id}:editCancel`),
        onField: ({ field, value }) =>
          api.notify(`#${id}:fieldSet`, { field, value }),
        onSave: () => api.notify(`#${id}:save`, { ...entity.values }),
        onEdit: () => api.notify(`#${id}:editStart`),
        onPhoto: (file) => api.notify(`#${id}:avatarCropOpen`, file),
        onPhotoCropCancel: () => api.notify(`#${id}:avatarCropCancel`),
        onPhotoCropApply: (rect) => api.notify(`#${id}:avatarSave`, { rect }),
        onLogout: () => api.notify(`#${id}:logout`),
        onDeactivateAsk: () => api.notify(`#${id}:accountDeactivateAsk`),
        onDeactivateCancel: () => api.notify(`#${id}:accountDeactivateCancel`),
        onDeactivate: () => api.notify(`#${id}:accountDeactivate`),
        onOpenRanks: () => api.notify("#router:navigate", paths.ranks),
        onOpenApplications: (status) =>
          api.notify("#router:navigate", paths.applicationsByStatus(status)),
        onOpenPreferences: () =>
          api.notify("#router:navigate", paths.preferences),
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
  entity.error = null
  entity.isEditing = false
  closeAvatarCrop(entity)
}
