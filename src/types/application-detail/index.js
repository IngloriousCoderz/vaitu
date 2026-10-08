import * as handlers from "./handlers.js"
import { subscribeApplications } from "../../api/events.js"
import { downloadIcs } from "./helpers.js"
import { renderApplicationDetail } from "./template.js"

const { applicationLoad, save, withdraw, giveUp, ...syncHandlers } = handlers

export const ApplicationDetail = {
  ...syncHandlers,
  ...applicationLoad,
  ...save,
  ...withdraw,
  ...giveUp,
  render(entity, api) {
    const id = entity.id
    if (entity.application_id) {
      subscribeApplications("application-detail", () =>
        api.notify(`#${id}:applicationLoad`, entity.application_id),
      )
    }
    return renderApplicationDetail({
      entity,
      onField: ({ field, value }) =>
        api.notify(`#${id}:fieldSet`, { field, value }),
      onSave: () =>
        api.notify(`#${id}:save`, {
          application_id: entity.application_id,
          motivation: entity.motivation,
        }),
      onAskWithdraw: () => api.notify(`#${id}:withdrawAsk`),
      onAskGiveUp: () => api.notify(`#${id}:giveUpAsk`),
      onGiveUp: () => api.notify(`#${id}:giveUp`, entity.application_id),
      onCancelGiveUp: () => api.notify(`#${id}:giveUpCancel`),
      onGoogleCalendar: (url) => window.open(url, "_blank", "noopener"),
      onDownloadIcs: (title, ics) => downloadIcs(`${title}.ics`, ics),
      onWithdraw: () => api.notify(`#${id}:withdraw`, entity.application_id),
      onCancelWithdraw: () => api.notify(`#${id}:withdrawCancel`),
      onBack: () => api.notify(`#${id}:back`),
      onNavigate: (value) => {
        if (value === "events") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
          api.notify("#applications:close")
        }
        if (value === "profile") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
          api.notify("#applications:close")
          api.notify("#profile:open")
        }
        if (value === "applications") {
          api.notify(`#${id}:close`)
          api.notify("#detail:close")
          api.notify("#applications:open")
        }
      },
    })
  },
}
