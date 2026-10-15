import { paths } from "../../routes.js"
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

  // The route is the source of truth for which page is live, so this is where a
  // page opens and loads. Everything else reads the route rather than an
  // `isOpen` flag, which is what used to make app.js a cascade.
  routeChange(entity, payload, api) {
    /* `payload.route`, never `api.getEntity("router").route`. This handler runs
       from inside the router's own notify, and a notification dispatched from a
       handler reads the state as it was before that handler's batch committed —
       so the router entity still named the route we are leaving. That made a
       back navigation look like the page we were on, and open() ran with the new
       route's empty params. The payload is the resolved route and cannot lag. */
    if (payload.route !== entity.id) {
      close(entity)
      return
    }
    open(entity, undefined, api)
  },

  render(entity, api) {
    return this.renderRanks({
      entity,
      onBack: () => api.notify("#router:navigate", paths.profile),
    })
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
