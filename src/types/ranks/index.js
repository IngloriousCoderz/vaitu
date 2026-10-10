import * as handlers from "./handlers.js"
import { Ranks as renderers } from "./template.js"

const { tiersLoad, ...syncHandlers } = handlers

export const Ranks = {
  ...syncHandlers,
  ...tiersLoad,
  ...renderers,

  create(entity) {
    entity.isOpen ??= false
    entity.tiers ??= null
    entity.status ??= "idle"
    entity.error ??= null
  },

  render(entity, api) {
    const id = entity.id

    return this.renderRanks({
      entity,
      onBack: () => api.notify(`#${id}:close`),
    })
  },
}
