import * as handlers from "./handlers.js"
import { renderProfile } from "./template.js"

const { loadProfile, logout, ...syncHandlers } = handlers

export const Profile = {
  ...syncHandlers,
  ...loadProfile,
  ...logout,
  render(entity, api) {
    const id = entity.id
    return renderProfile({
      entity,
      onBack: () => api.notify(`#${id}:close`),
      onLogout: () => api.notify(`#${id}:logout`),
    })
  },
}
