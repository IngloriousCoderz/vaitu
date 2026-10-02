import * as handlers from "./handlers.js"
import { renderProfile } from "./template.js"

const { profileLoad, profileSave, logout, ...syncHandlers } = handlers

export const Profile = {
  ...syncHandlers,
  ...profileLoad,
  ...profileSave,
  ...logout,
  render(entity, api) {
    const id = entity.id
    return renderProfile({
      entity,
      onEdit: () => api.notify(`#${id}:editStart`),
      onCancel: () => api.notify(`#${id}:editCancel`),
      onField: ({ field, value }) =>
        api.notify(`#${id}:profileFieldSet`, { field, value }),
      onSave: () => api.notify(`#${id}:profileSave`, { ...entity.draft }),
      onLogout: () => api.notify(`#${id}:logout`),
      onOpenRanks: () => api.notify("#ranks:open"),
      onOpenApplications: (status_filter) => {
        api.notify(`#${id}:close`)
        api.notify("#applications:open", status_filter)
      },
      renderCountry: () => api.render("country-profile"),
    })
  },
}
