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
    entity.category ??= "wedding"
    entity.title ??= ""
    entity.location ??= ""
    entity.country ??= ""
    entity.region ??= ""
    entity.event_date ??= ""
    entity.application_deadline ??= ""
    entity.max_applicants ??= 5
    entity.details ??= {}
    entity.audio_url ??= null
    entity.audio_preview_url ??= null
    entity.is_recording ??= false
    entity.is_audio_open ??= false
    entity.is_transcribing ??= false
    entity.is_parsing ??= false
    entity.audio_elapsed ??= 0
    entity.audio_transcript ??= null
    entity.audio_error ??= null
    entity.status ??= "idle"
    entity.error ??= null
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
        onSave: () => {
          const title_from = categoryById(entity.category).title_from
          const title = title_from.input
            ? entity.title
            : title_from.fields
                .map((field) => (entity.details[field] ?? "").trim())
                .join(title_from.join)
          return api.notify(`#${id}:save`, {
            editing_event_id: entity.editing_event_id,
            category: entity.category,
            title,
            location: entity.location,
            country: entity.country,
            region: entity.region,
            event_date: entity.event_date,
            application_deadline: entity.application_deadline,
            max_applicants: entity.max_applicants,
            audio_url: entity.audio_url,
            audio_transcript: entity.audio_transcript,
            details: entity.details,
          })
        },
      },
      api,
    )
  },
}
