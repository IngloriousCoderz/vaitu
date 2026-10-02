import * as handlers from "./handlers.js"
import { renderRanks } from "./template.js"

const { tiersLoad, ...syncHandlers } = handlers

export const RanksPage = {
  ...syncHandlers,
  ...tiersLoad,
  render(entity, api) {
    const id = entity.id
    return renderRanks({
      entity,
      onBack: () => api.notify(`#${id}:close`),
    })
  },
}
