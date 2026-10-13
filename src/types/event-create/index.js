import { Form } from "@inglorious/web/form"

import {
  DATETIME_LOCAL_LENGTH,
  DEFAULT_MAX_APPLICANTS,
  ZERO,
} from "../../constants.js"
import { isTicking, startTick } from "../../ticker.js"
import { categoryById } from "../event-list/categories.js"
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
    entity.isOpen ??= false
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
    if (!entity.isValid) return
    const values = entity.values
    const details = values.details ?? {}
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

  render(entity, api) {
    const id = entity.id
    if (entity.is_recording && entity.isOpen && !isTicking("audio")) {
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
        onBack: () => api.notify(`#${id}:close`),
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

function validateEvent(values) {
  const errors = {}
  const detailErrors = {}
  const details = values.details ?? {}
  const deadline = values.application_deadline ?? ""
  const deadlineOk =
    deadline.length === DATETIME_LOCAL_LENGTH &&
    !Number.isNaN(new Date(deadline).getTime())
  const max = Number(values.max_applicants)

  if (!(values.location ?? "").trim()) errors.location = "Required"
  if (!(values.country ?? "").trim()) errors.country = "Pick a country"
  if (!(values.region ?? "").trim()) errors.region = "Required"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.event_date ?? "")) {
    errors.event_date = "Pick a date"
  }
  if (!deadlineOk) errors.application_deadline = "Pick a deadline"
  if (!(Number.isInteger(max) && max > ZERO)) {
    errors.max_applicants = "Enter a positive number"
  }
  if (values.category === "festival") {
    if (!(values.title ?? "").trim()) errors.title = "Required"
    if (!(details.headliner ?? "").trim()) detailErrors.headliner = "Required"
  } else {
    if (!(details.spouse_first_name_1 ?? "").trim()) {
      detailErrors.spouse_first_name_1 = "Required"
    }
    if (!(details.spouse_first_name_2 ?? "").trim()) {
      detailErrors.spouse_first_name_2 = "Required"
    }
  }
  if (Object.keys(detailErrors).length) errors.details = detailErrors
  return errors
}
