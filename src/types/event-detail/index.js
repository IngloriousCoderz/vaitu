import { isProfileComplete } from "../profile/helpers.js"
import * as handlers from "./handlers.js"
import { renderDetail } from "./template.js"

const { apply, detailLoad, ...syncHandlers } = handlers

export const EventDetail = {
  ...syncHandlers,
  ...apply,
  ...detailLoad,
  render(entity, api) {
    const id = entity.id
    return renderDetail({
      entity,
      profileComplete: isProfileComplete(api.getEntity("profile").profile),
      onBack: () => api.notify(`#${id}:close`),
      onField: ({ field, value }) =>
        api.notify(`#${id}:fieldSet`, { field, value }),
      onSubmit: () => api.notify(`#${id}:applicationSubmit`),
      onCompleteProfile: () => {
        api.notify(`#${id}:close`)
        api.notify("#profile:open")
      },
    })
  },
}
