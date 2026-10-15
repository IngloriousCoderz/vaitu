import { Form } from "@inglorious/web/form"

import {
  activateRealtime,
  deactivateRealtime,
  realtimeColumn,
} from "../../api/realtime.js"
import { readUserId } from "../../api/session.js"
import { isTicking, startTick, stopTick } from "../../api/ticker.js"
import { DAY_MS } from "../../constants/index.js"
import { paths } from "../../routes.js"
import { isProfileComplete } from "../profile/helpers.js"
import * as handlers from "./handlers.js"
import { EventDetail as renderers } from "./template.js"

const { apply, detailLoad, ...syncHandlers } = handlers

export const EventDetail = {
  ...Form,
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
    entity.initialValues = {
      full_name: "",
      website: "",
      instagram: "",
      motivation: "",
    }
    Form.create(entity)
    entity.isSubmitted ??= false
    entity.applyStatus ??= "idle"
    entity.applyError ??= null
    activateRealtime(entity.id, {
      table: "events",
      event: `#${entity.id}:detailLoad`,
      payload: (state) => state[entity.id].event_id,
      match: (change, state) => {
        const eventId = state[entity.id]?.event_id
        return eventId != null && realtimeColumn(change, "id") === eventId
      },
    })
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
  },

  applySubmit(entity, _, api) {
    Form.validate(entity, { validate: validateApply })
    if (!entity.isValid) return
    entity.applyError = null
    api.notify(`#${entity.id}:applicationSubmit`)
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
    open(entity, payload.params.eventId, api)
  },

  render(entity, api) {
    const id = entity.id
    if (entity.event_id) {
      if (needsClock(entity.event) && !isTicking("clock")) {
        startTick("clock", () => api.notify(`#${id}:clockTick`))
      }
    }
    return this.renderEventDetail({
      entity,
      profileComplete: isProfileComplete(api.getEntity("profile").profile),
      onBack: () => api.notify("#router:navigate", paths.events),
      onField: ({ field, value }) =>
        api.notify(`#${id}:fieldSet`, { field, value }),
      onSubmit: () => api.notify(`#${id}:applySubmit`),
      onCompleteProfile: () => api.notify("#router:navigate", paths.profile),
      // Only the organiser has applications to review. The card that used to go
      // straight here now opens the event, so this is how the page is reached.
      onOpenApplications:
        entity.event?.senderId === readUserId()
          ? () =>
              api.notify(
                "#router:navigate",
                paths.receivedApplications(entity.event.id),
              )
          : undefined,
    })
  },
}

function validateApply(values) {
  const errors = {}
  if (!(values.motivation ?? "").trim()) {
    errors.motivation = "Motivation is required"
  }
  return errors
}

function needsClock(event) {
  if (!event?.application_deadline) return false
  const msLeft = new Date(event.application_deadline).getTime() - Date.now()
  return msLeft > 0 && msLeft < DAY_MS
}

function open(entity, event_id, api) {
  stopTick("clock")
  entity.event_id = event_id
  entity.event = null
  entity.senderName = null
  entity.status = "idle"
  entity.error = null
  entity.isSubmitted = false
  entity.applyStatus = "idle"
  entity.applyError = null
  Form.reset(entity)
  const profile = api.getEntity("profile").profile
  entity.values.full_name = profile?.full_name ?? ""
  entity.values.website = profile?.website ?? ""
  entity.values.instagram = profile?.instagram_handle ?? ""
  api.notify(`#${entity.id}:detailLoad`, event_id)
}

function close(entity) {
  stopTick("clock")
  entity.event_id = null
  entity.event = null
  entity.senderName = null
  entity.status = "idle"
  entity.error = null
  entity.isSubmitted = false
  entity.applyError = null
  Form.reset(entity)
}
