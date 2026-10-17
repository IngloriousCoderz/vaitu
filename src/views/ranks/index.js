import { pageRouteChange } from "../../common/page-route.js"
import * as handlers from "./handlers.js"
import { Ranks as renderers } from "./template.js"

const { tiersLoad, ...syncHandlers } = handlers

export const Ranks = {
  ...syncHandlers,
  ...tiersLoad,
  ...renderers,

  create(entity) {
    entity.tiers ??= null
    entity.status ??= "idle"
    entity.error ??= null
  },

  routeChange: pageRouteChange(open, close),

  render(entity, api) {
    return this.renderRanks(
      {
        entity,
      },
      api,
    )
  },
}

function open(entity, _, api) {
  entity.status = "idle"
  entity.error = null
  api.notify(`#${entity.id}:tiersLoad`)
}

function close(entity) {
  entity.status = "idle"
  entity.error = null
}
