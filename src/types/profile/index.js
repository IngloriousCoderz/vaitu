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
      onSave: () =>
        api.notify(`#${id}:saveProfile`, { ...entity.draft }),
      onLogout: () => api.notify(`#${id}:logout`),
      onNavigate: (value) => {
        if (value === "events") {
          api.notify(`#${id}:close`)
          api.notify("#applications:close")
          api.notify("#detail:close")
        }
        if (value === "applications") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
          api.notify("#applications:open")
        }
      },
    })
  },
}
