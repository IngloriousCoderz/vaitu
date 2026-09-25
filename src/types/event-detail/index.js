import * as handlers from "./handlers.js"
import { renderDetail } from "./template.js"

const { loadDetail, ...syncHandlers } = handlers

export const EventDetail = {
  ...syncHandlers,
  ...loadDetail,
  render(entity, api) {
    const id = entity.id
    return renderDetail({
      entity,
      onBack: () => api.notify(`#${id}:close`),
      onField: ({ field, value }) =>
        api.notify(`#${id}:setField`, { field, value }),
      onSubmit: () => api.notify(`#${id}:submitApplication`),
    })
  },
}
