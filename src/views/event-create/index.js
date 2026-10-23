import { Form, getFieldError } from "@inglorious/web/form"

import { isTicking, startTick } from "../../api/ticker.js"
import { pageRouteChange } from "../../common/page-route.js"
import { DEFAULT_MAX_APPLICANTS, ZERO } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { validateEvent } from "../../validation/events.js"
import { categoryById } from "../event-list/categories.js"
import {
  clearEventImages,
  clearPendingAudio,
  releaseRecorder,
} from "./handlers.js"
import * as handlers from "./handlers.js"
import { EventCreate as renderers } from "./template.js"

const {
  save,
  editLoad,
  audioRecord,
  audioProcess,
  audioParse,
  coverCropConfirm,
  coverCropEdit,
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
  ...coverCropConfirm,
  ...coverCropEdit,
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
    entity.cover_url ??= null
    entity.gallery_urls ??= []
    entity.loaded_image_urls ??= []
    entity.pending_cover ??= null
    entity.pending_gallery ??= []
    entity.image_error ??= null
    entity.isCropOpen ??= false
    entity.hasCropFile ??= false
    entity.cropPreviewUrl ??= null
    entity.cropImageWidth ??= ZERO
    entity.cropImageHeight ??= ZERO
    entity.cropX ??= ZERO
    entity.cropY ??= ZERO
    entity.cropW ??= 1
    entity.cropH ??= 1
    entity.cropRestoreRect ??= null
    entity.cropAllowFullPhoto ??= false
    entity.isCropSaving ??= false
    entity.isCropDragging ??= false
    entity.cropError ??= null
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
    // Validates what will be saved, not the raw form: a category whose title is
    // built from other fields has no title field, so the form's own title stays
    // empty and failed "Add a title" where nobody could see it.
    Form.validate(entity, {
      validate: (values) =>
        validateEvent({ ...values, title: eventTitle(values) }),
    })
    syncComboboxErrors(entity, api)
    if (!entity.isValid) return
    const values = entity.values
    // Copied here, while `values` is still the live draft. Everything below
    // travels through a notify, and a payload outlives the batch that built it:
    // by the time the save handler reads it, the store has committed and revoked
    // the proxies this one was read from. Passing the reference on meant the
    // insert died on "Cannot perform 'get' on a proxy that has been revoked".
    const details = { ...(values.details ?? {}) }
    const title = eventTitle(values)
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
      cover_url: entity.cover_url,
      gallery_urls: [...(entity.gallery_urls ?? [])],
      loaded_image_urls: [...(entity.loaded_image_urls ?? [])],
      pending_cover: entity.pending_cover
        ? { id: entity.pending_cover.id }
        : null,
      pending_gallery: (entity.pending_gallery ?? []).map((item) => ({
        id: item.id,
      })),
      details,
    })
  },

  routeChange: pageRouteChange(open, close, (payload) => ({
    event_id: payload.params.eventId,
  })),

  renderHeader(entity, api) {
    const id = entity.id
    return {
      title: entity.editing_event_id
        ? t("create.editTitle")
        : t("create.newTitle"),
      back: paths.events,
      actions: this.renderHeaderActions({
        entity,
        onRecordStop: () => api.notify(`#${id}:audioRecordStop`),
        onOpenAudio: () => api.notify(`#${id}:audioOpen`),
      }),
    }
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
        onRecordStart: () => api.notify(`#${id}:audioRecord`),
        onRecordStop: () => api.notify(`#${id}:audioRecordStop`),
        onOpenAudio: () => api.notify(`#${id}:audioOpen`),
        onCancelAudio: () => api.notify(`#${id}:audioCancel`),
        onRemoveAudio: () => api.notify(`#${id}:audioRemove`),
        onImagesAdd: (payload) => api.notify(`#${id}:imagesAdd`, payload),
        onImageRemove: (photo) => api.notify(`#${id}:imagesRemove`, photo),
        onCoverSelect: (file) => api.notify(`#${id}:coverCropOpen`, file),
        onCoverEdit: () =>
          api.notify(`#${id}:coverCropEdit`, {
            id: entity.pending_cover?.id ?? null,
            url: entity.cover_url ?? null,
            cropX: entity.pending_cover?.cropX,
            cropY: entity.pending_cover?.cropY,
            cropW: entity.pending_cover?.cropW,
            cropH: entity.pending_cover?.cropH,
          }),
        onCropImageLoad: (size) =>
          api.notify(`#${id}:coverCropImageLoad`, size),
        onCropWheel: (deltaY) =>
          api.notify(`#${id}:coverCropWheel`, deltaY),
        onCropKey: (key) => api.notify(`#${id}:coverCropKeyDown`, key),
        onCropPointerDown: (pointer) =>
          api.notify(`#${id}:coverCropPointerDown`, pointer),
        onCropPointerMove: (pointer) =>
          api.notify(`#${id}:coverCropPointerMove`, pointer),
        onCropPointerEnd: (pointer) =>
          api.notify(`#${id}:coverCropPointerEnd`, pointer),
        onCropCancel: () => api.notify(`#${id}:coverCropCancel`),
        onCropUseOriginal: () => api.notify(`#${id}:coverCropUseOriginal`),
        onCropConfirm: () =>
          api.notify(`#${id}:coverCropConfirm`, {
            cropX: entity.cropX,
            cropY: entity.cropY,
            cropW: entity.cropW,
            cropH: entity.cropH,
          }),
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
  api.notify("#style-create:errorSet", getFieldError(entity, "details.style"))
  api.notify("#genre-create:errorSet", getFieldError(entity, "details.genre"))
}

// The title the event is saved under: typed in for a category that asks for
// one, otherwise built from its fields, such as the couple's names.
function eventTitle(values) {
  const title_from = categoryById(values.category).title_from
  if (title_from.input) return values.title
  const details = values.details ?? {}
  return title_from.fields
    .map((field) => (details[field] ?? "").trim())
    .join(title_from.join)
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
  clearEventImages(entity)
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
  clearEventImages(entity)
  releaseRecorder()
  clearPendingAudio()
}
