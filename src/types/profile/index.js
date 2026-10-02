import * as handlers from "./handlers.js"
import { renderProfile } from "./template.js"

const { loadProfile, saveProfile, logout, ...syncHandlers } = handlers

export const Profile = {
  ...syncHandlers,
  ...loadProfile,
  ...saveProfile,
  ...logout,
  render(entity, api) {
    const id = entity.id
    return renderProfile({
      entity,
      onEdit: () => api.notify(`#${id}:startEdit`),
      onCancel: () => api.notify(`#${id}:cancelEdit`),
      onField: ({ field, value }) =>
        api.notify(`#${id}:setProfileField`, { field, value }),
      onSave: () => api.notify(`#${id}:saveProfile`, { ...entity.draft }),
      onLogout: () => api.notify(`#${id}:logout`),
      onOpenApplications: (status_filter) => {
        api.notify(`#${id}:close`)
        api.notify("#applications:open", status_filter)
      },
      renderCountry: () => api.render("country-profile"),
    })
  },
}
