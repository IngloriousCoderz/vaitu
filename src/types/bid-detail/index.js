import * as handlers from "./handlers.js"
import { renderBidDetail } from "./template.js"

const { loadBid, save, withdraw, ...syncHandlers } = handlers

export const BidDetail = {
  ...syncHandlers,
  ...loadBid,
  ...save,
  ...withdraw,
  render(entity, api) {
    const id = entity.id
    return renderBidDetail({
      entity,
      onField: ({ field, value }) =>
        api.notify(`#${id}:setField`, { field, value }),
      onSave: () =>
        api.notify(`#${id}:save`, {
          application_id: entity.application_id,
          motivation: entity.motivation,
        }),
      onAskWithdraw: () => api.notify(`#${id}:askWithdraw`),
      onWithdraw: () =>
        api.notify(`#${id}:withdraw`, entity.application_id),
      onCancelWithdraw: () => api.notify(`#${id}:cancelWithdraw`),
      onBack: () => {
        api.notify(`#${id}:close`)
        api.notify("#bids:open")
      },
      onNavigate: (value) => {
        if (value === "events") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
          api.notify("#bids:close")
        }
        if (value === "profile") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
          api.notify("#bids:close")
          api.notify("#profile:open")
        }
        if (value === "applications") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
          api.notify("#bids:open")
        }
      },
    })
  },
}
