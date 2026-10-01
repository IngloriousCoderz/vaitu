import { isProfileComplete } from "../profile/helpers.js"
import * as handlers from "./handlers.js"
import { renderDetail } from "./template.js"

const { apply, loadDetail, ...syncHandlers } = handlers

export const EventDetail = {
  ...syncHandlers,
  ...apply,
  ...loadDetail,
  render(entity, api) {
    const id = entity.id
    return renderDetail({
      entity,
      profileComplete: isProfileComplete(api.getEntity("profile").profile),
      onBack: () => api.notify(`#${id}:close`),
      onField: ({ field, value }) =>
        api.notify(`#${id}:setField`, { field, value }),
      onSubmit: () => api.notify(`#${id}:submitApplication`),
      onCompleteProfile: () => {
        api.notify(`#${id}:close`)
        api.notify("#profile:open")
      },
    })
  },
}
