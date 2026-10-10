import { subscribeEvents } from "../../api/events.js"
import { DAY_MS } from "../../constants.js"
import { isTicking, startTick } from "../../ticker.js"
import { isProfileComplete } from "../profile/helpers.js"
import * as handlers from "./handlers.js"
import { EventDetail as renderers } from "./template.js"

const { apply, detailLoad, ...syncHandlers } = handlers

export const EventDetail = {
  ...syncHandlers,
  ...apply,
  ...detailLoad,
  ...renderers,

  create(entity) {
    entity.event_id ??= null
    entity.event ??= null
    entity.senderName ??= null
    entity.status ??= "idle"
    entity.error ??= null
    entity.full_name ??= ""
    entity.website ??= ""
    entity.instagram ??= ""
    entity.motivation ??= ""
    entity.isSubmitted ??= false
    entity.applyStatus ??= "idle"
    entity.applyError ??= null
  },

  render(entity, api) {
    const id = entity.id
    if (entity.event_id) {
      subscribeEvents(
        "event-detail",
        () => api.notify(`#${id}:detailLoad`, entity.event_id),
        `id=eq.${entity.event_id}`,
      )
      if (needsClock(entity.event) && !isTicking("clock")) {
        startTick("clock", () => api.notify(`#${id}:clockTick`))
      }
    }
    return this.renderEventDetail({
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

function needsClock(event) {
  if (!event?.application_deadline) return false
  const msLeft = new Date(event.application_deadline).getTime() - Date.now()
  return msLeft > 0 && msLeft < DAY_MS
}
