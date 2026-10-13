import { Form } from "@inglorious/web/form"

import {
  activateRealtime,
  deactivateRealtime,
  realtimeColumn,
} from "../../realtime.js"
import * as handlers from "./handlers.js"
import { Profile as renderers } from "./template.js"

const { profileLoad, profileSave, logout, ...syncHandlers } = handlers

export const Profile = {
  ...Form,
  ...syncHandlers,
  ...profileLoad,
  ...profileSave,
  ...logout,
  ...renderers,

  create(entity) {
    entity.isOpen ??= false
    entity.profile ??= null
    entity.stats ??= null
    entity.isEditing ??= false
    entity.isMenuOpen ??= false
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
    entity.status ??= "idle"
    entity.error ??= null
    activateRealtime(entity.id, {
      table: "applications",
      event: `#${entity.id}:profileLoad`,
      match: (change, state) => {
        const applicantId = state[entity.id]?.profile?.id
        return (
          applicantId != null &&
          realtimeColumn(change, "applicant_id") === applicantId
        )
      },
    })
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
  },

  render(entity, api) {
    const id = entity.id
    return this.renderProfile({
      entity,
      onEdit: () => api.notify(`#${id}:editStart`),
      onCancel: () => api.notify(`#${id}:editCancel`),
      onField: ({ field, value }) =>
        api.notify(`#${id}:profileFieldSet`, { field, value }),
      onFavoriteInput: (value) => api.notify(`#${id}:favoriteInputSet`, value),
      onFavoriteAdd: (value) => api.notify(`#${id}:favoriteAdd`, value),
      onFavoriteRemove: (value) => api.notify(`#${id}:favoriteRemove`, value),
      onSave: () => api.notify(`#${id}:profileSave`, { ...entity.values }),
      onLogout: () => api.notify(`#${id}:logout`),
      onOpenRanks: () => api.notify("#ranks:open"),
      onToggleMenu: () => api.notify(`#${id}:menuToggle`),
      onCloseMenu: () => api.notify(`#${id}:menuClose`),
      onOpenApplications: (status_filter) => {
        api.notify(`#${id}:close`)
        api.notify("#applicationList:open", status_filter)
      },
      renderCountry: () => api.render("country-profile"),
      renderRegion: () => api.render("region-profile"),
      renderFavoriteChoice: () => api.render("favorite-region-profile"),
    })
  },
}
