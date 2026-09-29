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
      onLogout: () => api.notify(`#${id}:logout`),
      onNavigate: (value) => {
        if (value === "events") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
        }
      },
    })
  },
}
