import { Form, getFieldError } from "@inglorious/web/form"
import { pageRouteChange } from "@inglorious/web/router"

import {
  DEFAULT_MAX_APPLICANTS,
  NO_TIME_RECORDED,
} from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { validateJob } from "../../validation/jobs.js"
import { categoryById } from "../job-list/categories.js"
import * as handlers from "./handlers.js"
import {
  clearJobImages,
  clearPendingAudio,
  releaseRecorder,
} from "./handlers.js"
import { payFromForm, payToForm } from "./helpers.js"
import { template } from "./template.js"

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

export const JobCreate = {
  ...Form,
  ...syncHandlers,
  ...save,
  ...editLoad,
  ...audioRecord,
  ...audioProcess,
  ...audioParse,
  ...coverCropConfirm,
  ...coverCropEdit,
  ...template,

  create(entity) {
    entity.editing_job_id ??= null
    entity.initialValues = {
      category: "wedding",
      profession: "photographer",
      title: "",
      location: "",
      country: "",
      region: "",
      job_date: "",
      application_deadline: "",
      max_applicants: DEFAULT_MAX_APPLICANTS,
      details: {},
      ...payToForm(null),
    }
    Form.create(entity)
    entity.cover_url ??= null
    entity.gallery_urls ??= []
    entity.loaded_image_urls ??= []
    entity.pending_cover ??= null
    entity.pending_gallery ??= []
    entity.image_error ??= null
    entity.isCropOpen ??= false
    entity.cropPreviewUrl ??= null
    entity.isCropSaving ??= false
    entity.cropError ??= null
    entity.audio_preview_url ??= null
    entity.is_recording ??= false
    entity.is_audio_open ??= false
    entity.is_transcribing ??= false
    entity.is_parsing ??= false
    entity.is_voice_wait_dismissed ??= false
    entity.audio_elapsed ??= NO_TIME_RECORDED
    entity.audio_transcript ??= null
    entity.audio_error ??= null
    entity.status ??= "idle"
    entity.error ??= null
  },

  saveSubmit(entity, _, api) {
    Form.validate(entity, {
      validate: (values) =>
        validateJob({
          ...values,
          max_applicants: Number(values.max_applicants),
          title: jobTitle(values),
          pay: payFromForm(values),
        }),
    })
    syncComboboxErrors(entity, api)
    if (!entity.isValid) return
    const values = entity.values
    // Copied while `values` is still a live draft: the save reads it after the
    // batch, when the draft is revoked.
    const details = { ...(values.details ?? {}) }
    const title = jobTitle(values)
    entity.error = null
    api.notify(`#${entity.id}:save`, {
      editing_job_id: entity.editing_job_id,
      category: values.category,
      profession: values.profession,
      title,
      location: values.location,
      country: values.country,
      region: values.region,
      job_date: values.job_date,
      application_deadline: values.application_deadline,
      max_applicants: Number(values.max_applicants),
      pay: payFromForm(values),
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

  routeChange: pageRouteChange({
    select: (payload) => ({
      job_id: payload.params.jobId,
    }),
    open,
    close,
  }),

  renderHeader(entity, api) {
    const id = entity.id
    return {
      title: entity.editing_job_id
        ? t("create.editTitle")
        : t("create.newTitle"),
      back: entity.editing_job_id ? paths.myJobs : paths.jobs,
      actions: this.renderHeaderActions({
        entity,
        onRecordStop: () => api.notify(`#${id}:audioRecordStop`),
        onOpenAudio: () => api.notify(`#${id}:audioOpen`),
      }),
    }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderJobCreate(
      {
        entity,
        onField: ({ field, value }) =>
          api.notify(
            `#${id}:${field === "job_date" ? "jobDateSet" : "fieldSet"}`,
            {
              field,
              value,
            },
          ),
        onDetailField: ({ field, value }) =>
          api.notify(`#${id}:detailFieldSet`, { field, value }),
        onRecordStart: () => api.notify(`#${id}:audioRecord`),
        onRecordStop: () => api.notify(`#${id}:audioRecordStop`),
        onCancelAudio: () => api.notify(`#${id}:audioCancel`),
        onVoiceWaitDismiss: () => api.notify(`#${id}:voiceWaitDismiss`),
        onRemoveAudio: () => api.notify(`#${id}:audioRemove`),
        onImagesAdd: (payload) => api.notify(`#${id}:imagesAdd`, payload),
        onImageRemove: (photo) => api.notify(`#${id}:imagesRemove`, photo),
        onCoverSelect: (file) => api.notify(`#${id}:coverCropOpen`, { file }),
        onCoverEdit: () =>
          api.notify(`#${id}:coverCropEdit`, {
            id: entity.pending_cover?.id ?? null,
            url: entity.cover_url ?? null,
            rect: entity.pending_cover?.rect ?? null,
          }),
        onCropCancel: () => api.notify(`#${id}:coverCropCancel`),
        onCropConfirm: (rect) =>
          api.notify(`#${id}:coverCropConfirm`, { rect }),
        onSave: () => api.notify(`#${id}:saveSubmit`),
      },
      api,
    )
  },
}

function syncComboboxErrors(entity, api) {
  api.notify("#countryCreate:errorSet", getFieldError(entity, "country"))
  api.notify("#regionCreate:errorSet", getFieldError(entity, "region"))
  api.notify("#styleCreate:errorSet", getFieldError(entity, "details.style"))
  api.notify("#genreCreate:errorSet", getFieldError(entity, "details.genre"))
}

function jobTitle(values) {
  const title_from = categoryById(values.category).title_from
  if (title_from.input) return values.title
  const details = values.details ?? {}
  return title_from.fields
    .map((field) => (details[field] ?? "").trim())
    .join(title_from.join)
}

function open(entity, { job_id } = {}, api) {
  entity.status = "idle"
  entity.error = null
  entity.editing_job_id = job_id ?? null
  Form.reset(entity)
  entity.audio_preview_url = null
  entity.is_recording = false
  entity.is_audio_open = false
  entity.is_transcribing = false
  entity.is_parsing = false
  entity.is_voice_wait_dismissed = false
  entity.audio_elapsed = NO_TIME_RECORDED
  entity.audio_transcript = null
  entity.audio_error = null
  clearJobImages(entity)
  releaseRecorder()
  clearPendingAudio()
  api.notify("#countryCreate:valueSet", "")
  api.notify("#regionCreate:valueSet", "")
  api.notify("#styleCreate:valueSet", "")
  api.notify("#genreCreate:valueSet", "")
  if (!job_id) handlers.jobTypeOptionsSync(entity, null, api)
  if (job_id) api.notify(`#${entity.id}:editLoad`, job_id)
}

function close(entity) {
  entity.status = "idle"
  entity.error = null
  entity.is_audio_open = false
  clearJobImages(entity)
  releaseRecorder()
  clearPendingAudio()
}
