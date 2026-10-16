import { Form, getFieldError } from "@inglorious/web/form"

import { isTicking, startTick } from "../../api/ticker.js"
import { DEFAULT_MAX_APPLICANTS, ZERO } from "../../constants/index.js"
import { paths } from "../../routes.js"
import { validateEvent } from "../../validation/events.js"
import { categoryById } from "../event-list/categories.js"
import { clearPendingAudio, releaseRecorder } from "./handlers.js"
import * as handlers from "./handlers.js"
import { EventCreate as renderers } from "./template.js"

const {
  save,
  editLoad,
  audioRecord,
  audioProcess,
  audioParse,
  ...syncHandlers
} = handlers

export const EventCreate = {
  ...Form,
  ...syncHandlers,
  ...save,
  ...editLoad,
  ...audioRecord,
  ...audioProcess,
  ...audioParse,
  ...renderers,

  create(entity) {
    entity.editing_event_id ??= null
    entity.initialValues = {
      category: "wedding",
      title: "",
      location: "",
      country: "",
      region: "",
      event_date: "",
      application_deadline: "",
      max_applicants: DEFAULT_MAX_APPLICANTS,
      details: {},
    }
    Form.create(entity)
    entity.audio_url ??= null
    entity.audio_preview_url ??= null
    entity.is_recording ??= false
    entity.is_audio_open ??= false
    entity.is_transcribing ??= false
    entity.is_parsing ??= false
    entity.audio_elapsed ??= ZERO
    entity.audio_transcript ??= null
    entity.audio_error ??= null
    entity.status ??= "idle"
    entity.error ??= null
  },

  saveSubmit(entity, _, api) {
    Form.validate(entity, { validate: validateEvent })
    syncComboboxErrors(entity, api)
    if (!entity.isValid) return
    const values = entity.values
    // Copied here, while `values` is still the live draft. Everything below
    // travels through a notify, and a payload outlives the batch that built it:
    // by the time the save handler reads it, the store has committed and revoked
    // the proxies this one was read from. Passing the reference on meant the
    // insert died on "Cannot perform 'get' on a proxy that has been revoked".
    const details = { ...(values.details ?? {}) }
    const title_from = categoryById(values.category).title_from
    const title = title_from.input
      ? values.title
      : title_from.fields
          .map((field) => (details[field] ?? "").trim())
          .join(title_from.join)
    entity.error = null
    api.notify(`#${entity.id}:save`, {
      editing_event_id: entity.editing_event_id,
      category: values.category,
      title,
      location: values.location,
      country: values.country,
      region: values.region,
      event_date: values.event_date,
      application_deadline: values.application_deadline,
      max_applicants: values.max_applicants,
      audio_url: entity.audio_url,
      audio_transcript: entity.audio_transcript,
      details,
    })
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
    open(entity, { event_id: payload.params.eventId }, api)
  },

  render(entity, api) {
    const id = entity.id
    if (entity.is_recording && !isTicking("audio")) {
      startTick("audio", () => api.notify(`#${id}:audioTick`))
    }
    return this.renderEventCreate(
      {
        entity,
        onField: ({ field, value }) =>
          api.notify(
            `#${id}:${field === "event_date" ? "eventDateSet" : "fieldSet"}`,
            {
              field,
              value,
            },
          ),
        onDetailField: ({ field, value }) =>
          api.notify(`#${id}:detailFieldSet`, { field, value }),
        onCategory: (category) => api.notify(`#${id}:categorySelect`, category),
        onBack: () => api.notify("#router:navigate", paths.events),
        onRecordStart: () => api.notify(`#${id}:audioRecord`),
        onRecordStop: () => api.notify(`#${id}:audioRecordStop`),
        onOpenAudio: () => api.notify(`#${id}:audioOpen`),
        onCancelAudio: () => api.notify(`#${id}:audioCancel`),
        onRemoveAudio: () => api.notify(`#${id}:audioRemove`),
        onSave: () => api.notify(`#${id}:saveSubmit`),
      },
      api,
    )
  },
}

// The country and region comboboxes are separate entities rendered by id, so
// they cannot read the form's errors. Hand them over where validation runs, the
// same way their values and options are already handed over.
function syncComboboxErrors(entity, api) {
  api.notify("#country-create:errorSet", getFieldError(entity, "country"))
  api.notify("#region-create:errorSet", getFieldError(entity, "region"))
  api.notify(
    "#style-create:errorSet",
    getFieldError(entity, "details.style"),
  )
  api.notify(
    "#genre-create:errorSet",
    getFieldError(entity, "details.genre"),
  )
}

function open(entity, { event_id } = {}, api) {
  entity.status = "idle"
  entity.error = null
  entity.editing_event_id = event_id ?? null
  Form.reset(entity)
  entity.audio_url = null
  entity.audio_preview_url = null
  entity.is_recording = false
  entity.is_audio_open = false
  entity.is_transcribing = false
  entity.is_parsing = false
  entity.audio_elapsed = ZERO
  entity.audio_transcript = null
  entity.audio_error = null
  releaseRecorder()
  clearPendingAudio()
  api.notify("#country-create:sync", "")
  api.notify("#region-create:sync", "")
  api.notify("#style-create:sync", "")
  api.notify("#genre-create:sync", "")
  if (event_id) api.notify(`#${entity.id}:editLoad`, event_id)
}

function close(entity) {
  entity.status = "idle"
  entity.error = null
  entity.is_audio_open = false
  releaseRecorder()
  clearPendingAudio()
}
