import { subscribeApplications } from "../../api/events.js"
import * as handlers from "./handlers.js"
import { Profile as renderers } from "./template.js"

const { profileLoad, profileSave, logout, ...syncHandlers } = handlers

export const Profile = {
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
    entity.draft ??= null
    entity.favoriteInput ??= ""
    entity.status ??= "idle"
    entity.error ??= null
  },

  render(entity, api) {
    const id = entity.id
    if (entity.profile?.id) {
      subscribeApplications(
        "profile",
        () => api.notify(`#${id}:profileLoad`),
        `applicant_id=eq.${entity.profile.id}`,
      )
    }
    return this.renderProfile({
      entity,
      onEdit: () => api.notify(`#${id}:editStart`),
      onCancel: () => api.notify(`#${id}:editCancel`),
      onField: ({ field, value }) =>
        api.notify(`#${id}:profileFieldSet`, { field, value }),
      onFavoriteInput: (value) => api.notify(`#${id}:favoriteInputSet`, value),
      onFavoriteAdd: (value) => api.notify(`#${id}:favoriteAdd`, value),
      onFavoriteRemove: (value) => api.notify(`#${id}:favoriteRemove`, value),
      onSave: () => api.notify(`#${id}:profileSave`, { ...entity.draft }),
      onLogout: () => api.notify(`#${id}:logout`),
      onOpenRanks: () => api.notify("#ranks:open"),
      onToggleMenu: () => api.notify(`#${id}:menuToggle`),
      onCloseMenu: () => api.notify(`#${id}:menuClose`),
      onOpenApplications: (status_filter) => {
        api.notify(`#${id}:close`)
        api.notify("#applicationList:open", status_filter)
      },
      renderCountry: () => api.render("country-profile"),
    })
  },
}
