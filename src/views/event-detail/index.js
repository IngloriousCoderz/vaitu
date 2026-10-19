import { Form } from "@inglorious/web/form"

import {
  activateRealtime,
  deactivateRealtime,
  realtimeColumn,
} from "../../api/realtime.js"
import { readUserId } from "../../api/session.js"
import { isTicking, startTick, stopTick } from "../../api/ticker.js"
import { pageRouteChange } from "../../common/page-route.js"
import { isProfileComplete } from "../../common/profile.js"
import { DAY_MS } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
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
    entity.photoIndex ??= 0
    entity.photoPreview ??= false
    // The id is snapshotted because these closures outlive the batch that
    // built them: they fire from a realtime message, by which point the
    // draft this entity was is revoked and reading entity.id throws.
    const id = entity.id
    activateRealtime(id, {
      table: "events",
      event: `#${id}:detailLoad`,
      payload: (state) => state[id]?.event_id,
      match: (change, state) => {
        const eventId = state[id]?.event_id
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

  routeChange: pageRouteChange(
    open,
    close,
    (payload) => payload.params.eventId,
  ),

  renderHeader(entity) {
    return { title: entity.event?.title ?? "", back: paths.events }
  },

  render(entity, api) {
    const id = entity.id
    if (entity.event_id) {
      if (needsClock(entity.event) && !isTicking("clock")) {
        startTick("clock", () => api.notify(`#${id}:clockTick`))
      }
    }
    return this.renderEventDetail(
      {
        entity,
        profileComplete: isProfileComplete(api.getEntity("profile").profile),
        onOpenEvents: () => api.notify("#router:navigate", paths.events),
        onField: ({ field, value }) =>
          api.notify(`#${id}:fieldSet`, { field, value }),
        onSubmit: () => api.notify(`#${id}:applySubmit`),
        onCompleteProfile: () => api.notify("#router:navigate", paths.profile),
        onPhotoOpen: (index) => api.notify(`#${id}:photoOpen`, index),
        onPhotoClose: () => api.notify(`#${id}:photoClose`),
        onPhotoStep: (delta) => api.notify(`#${id}:photoStep`, delta),
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
      },
      api,
    )
  },
}

function validateApply(values) {
  const errors = {}
  if (!(values.motivation ?? "").trim()) {
    errors.motivation = t("validation.motivationRequired")
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
  entity.photoIndex = 0
  entity.photoPreview = false
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
  entity.photoIndex = 0
  entity.photoPreview = false
  Form.reset(entity)
}
