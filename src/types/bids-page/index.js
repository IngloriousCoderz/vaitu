import * as handlers from "./handlers.js"
import { renderBids } from "./template.js"

const { loadBids, ...syncHandlers } = handlers

export const BidsPage = {
  ...syncHandlers,
  ...loadBids,
  render(entity, api) {
    const id = entity.id
    return renderBids({
      entity,
      onOpenEvent: (event_id) => {
        const bid = entity.bids.find((b) => b.id === event_id)
        if (bid) api.notify("#bid-detail:open", bid.application_id)
      },
      onNavigate: (value) => {
        if (value === "events") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
        }
        if (value === "profile") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
          api.notify("#profile:open")
        }
      },
    })
  },
}
