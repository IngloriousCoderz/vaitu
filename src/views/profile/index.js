import { Form } from "@inglorious/web/form"

import {
  activateRealtime,
  deactivateRealtime,
  realtimeColumn,
} from "../../api/realtime.js"
import { pageRouteChange } from "../../common/page-route.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { closeAvatarCrop } from "./handlers.js"
import { Profile as renderers } from "./template.js"

const {
  load,
  save,
  localeSave,
  emailOptOutSave,
  accountDeactivate,
  logout,
  avatarSave,
  ...syncHandlers
} = handlers

export const Profile = {
  ...Form,
  ...syncHandlers,
  ...load,
  ...save,
  ...localeSave,
  ...emailOptOutSave,
  ...accountDeactivate,
  ...logout,
  ...avatarSave,
  ...renderers,

  // The tab bar shows the profile on every page, so it loads at sign-in
  // rather than on the first visit to the tab.
  sessionStart(entity, _, api) {
    api.notify(`#${entity.id}:load`)
  },

  create(entity, _, api) {
    entity.profile ??= null
    entity.stats ??= null
    entity.isEditing ??= false
    entity.initialValues = {
      full_name: "",
      website: "",
      instagram_handle: "",
      country: "",
      region: "",
      favorite_regions: [],
    }
    Form.create(entity)
    entity.favoriteInput ??= ""
    entity.isConfirmingDeactivate ??= false
    entity.deactivateStatus ??= "idle"
    entity.deactivateError ??= null
    entity.avatarStatus ??= "idle"
    entity.avatarError ??= null
    entity.avatarPreviewUrl ??= null
    entity.isAvatarCropOpen ??= false
    entity.status ??= "idle"
    entity.error ??= null
    entity.emailOptOutStatus ??= "idle"
    entity.emailOptOutError ??= null
    // The id is snapshotted because this closure outlives the batch that built
    // it: it fires from a realtime message, by which point the draft this
    // entity was is revoked and reading entity.id throws.
    const id = entity.id
    activateRealtime(
      id,
      {
        table: "applications",
        event: `#${id}:load`,
        match: (change, state) => {
          const applicantId = state[id]?.profile?.id
          return (
            applicantId != null &&
            realtimeColumn(change, "applicant_id") === applicantId
          )
        },
      },
      api,
    )
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
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
        onFavoriteInput: (value) =>
          api.notify(`#${id}:favoriteInputSet`, value),
        onFavoriteAdd: (value) => api.notify(`#${id}:favoriteAdd`, value),
        onFavoriteRemove: (value) => api.notify(`#${id}:favoriteRemove`, value),
        onToggleInterest: (categoryId) =>
          api.notify(`#${id}:interestToggle`, categoryId),
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
        onEmailOptOut: (isOptedOut) =>
          api.notify(`#${id}:emailOptOutSave`, isOptedOut),
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
