import { handleAsync } from "@inglorious/store/async"
import { cropImage } from "@inglorious/ui/image-cropper"
import { Form, getFieldValue } from "@inglorious/web/form"
import fixWebmDuration from "fix-webm-duration"

import {
  createEvent,
  fetchEventForEdit,
  parseEvent,
  transcribeAudio,
  updateEvent,
} from "../../api/events.js"
import {
  deleteEventImage,
  EVENT_IMAGES_BUCKET,
  imageExtension,
  imageRefFromUrl,
  uploadEventImage,
} from "../../api/images.js"
import { startTick, stopTick } from "../../api/ticker.js"
import { createImageFile } from "../../common/image.js"
import {
  APPLICATION_DEADLINE_LEAD_DAYS,
  AUDIO_MAX_SECONDS,
  COVER_IMAGES,
  COVER_INDEX,
  COVER_OUTPUT_HEIGHT,
  COVER_OUTPUT_WIDTH,
  DATE_ISO_LENGTH,
  DATETIME_LOCAL_LENGTH,
  DEADLINE_END_OF_DAY,
  DEFAULT_MAX_APPLICANTS,
  FIRST_INDEX,
  IMAGE_JPEG_TYPE,
  IMAGE_MAX_BYTES,
  MAX_EVENT_IMAGES,
  MIN_AUDIO_BYTES,
  MONTH_INDEX_OFFSET,
  NO_TIME_RECORDED,
  ONE_SECOND,
  PAD_LENGTH,
} from "../../constants/index.js"
import {
  currencyAfterCountryChange,
  DEFAULT_CURRENCY,
} from "../../data/currencies.js"
import {
  jobTypeById,
  jobTypeId,
  jobTypesFor,
} from "../../data/event-taxonomy.js"
import {
  regionAfterCountryChange,
  regionForCountry,
} from "../../data/regions/resolve.js"
import { paths } from "../../routes.js"
import { randomId } from "../../text/index.js"
import { categoryById, hasDetail } from "../event-list/categories.js"
import { COVER_CROPPER } from "./cover-cropper.js"
import { droppedImageUrls, mergeParsedDetails, payToForm } from "./helpers.js"

const NO_ROOM = 0

// Module scope, not the entity: the recorder is not serializable.
let mediaRecorder = null
let mediaStream = null
let audioChunks = []
let pendingBlob = null
let previewUrl = null
let recordStartedAt = null

/** @type {Map<string, { file: File | null, sourceFile: File | null }>} */
const pendingImageFiles = new Map()
/** @type {File | null} */
let cropSessionFile = null

export function releaseRecorder() {
  stopTick("audio")
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.onstop = null
    mediaRecorder.stop()
  }
  mediaRecorder = null
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) track.stop()
    mediaStream = null
  }
  audioChunks = []
}

export function clearPendingAudio() {
  pendingBlob = null
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
}

export function fieldSet(entity, { field, value }, api) {
  if (field === "country") {
    const previous = getFieldValue(entity, "country", "")
    const region = regionAfterCountryChange(
      previous,
      value,
      getFieldValue(entity, "region", ""),
    )
    Form.fieldChange(entity, { path: "country", value })
    Form.fieldChange(entity, { path: "region", value: region })
    Form.fieldChange(entity, {
      path: "pay_currency",
      value: currencyAfterCountryChange(
        previous,
        value,
        getFieldValue(entity, "pay_currency", DEFAULT_CURRENCY),
      ),
    })
    api?.notify("#regionCreate:valueSet", region)
    api?.notify("#countryCreate:errorSet", null)
    api?.notify("#regionCreate:errorSet", null)
  } else {
    Form.fieldChange(entity, { path: field, value })
    if (field === "region") api?.notify("#regionCreate:errorSet", null)
  }
  entity.error = null
}

export function eventDateSet(entity, { value }) {
  Form.fieldChange(entity, { path: "event_date", value })
  entity.error = null
  autofillDeadline(entity)
}

export function detailFieldSet(entity, { field, value }) {
  Form.fieldChange(entity, { path: `details.${field}`, value })
  entity.error = null
}

export function jobTypeSelect(entity, { value }, api) {
  const { category, profession } = jobTypeById(value)
  const isSameCategory = getFieldValue(entity, "category", "") === category
  Form.fieldChange(entity, { path: "category", value: category })
  Form.fieldChange(entity, { path: "profession", value: profession })
  entity.error = null
  if (isSameCategory) {
    if (category === "wedding" && !hasDetail({ category, profession })) {
      Form.fieldChange(entity, { path: "details.style", value: undefined })
      api.notify("#styleCreate:valueSet", "")
    }
    return
  }
  Form.fieldChange(entity, { path: "details", value: {} })
  entity.errors = {}
  entity.isValid = true
  api.notify("#countryCreate:errorSet", null)
  api.notify("#regionCreate:errorSet", null)
  api.notify("#styleCreate:valueSet", "")
  api.notify("#genreCreate:valueSet", "")
}

// New jobs start on the poster's first job type. An edit keeps its own, even if
// the poster has since changed trade.
export function jobTypeOptionsSync(entity, _, api) {
  const mine = api.getEntity("eventList")?.professions ?? []
  const options = jobTypesFor([...mine])
  const current = jobTypeId(
    getFieldValue(entity, "category", ""),
    getFieldValue(entity, "profession", ""),
  )
  const isOffered = options.some((option) => option.id === current)
  if (entity.editing_event_id) {
    const own = jobTypeById(current)
    api.notify(
      "#jobTypeCreate:optionsSet",
      isOffered || !own ? options : [own, ...options],
    )
    api.notify("#jobTypeCreate:valueSet", current)
    return
  }
  api.notify("#jobTypeCreate:optionsSet", options)
  if (isOffered) {
    api.notify("#jobTypeCreate:valueSet", current)
    return
  }
  const [first] = options
  jobTypeSelect(entity, { value: first.id }, api)
  api.notify("#jobTypeCreate:valueSet", first.id)
}

export const audioRecord = handleAsync("audioRecord", {
  start(entity) {
    entity.audio_error = null
  },
  async run() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Microphone needs localhost or HTTPS — unavailable over LAN IP",
      )
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : ""
    mediaStream = stream
    audioChunks = []
    mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size) audioChunks.push(e.data)
    }
    mediaRecorder.start()
    recordStartedAt = Date.now()
    return true
  },
  success(entity, _, api) {
    entity.is_recording = true
    entity.audio_elapsed = NO_TIME_RECORDED
    const id = entity.id
    startTick("audio", () => api.notify(`#${id}:audioTick`))
  },
  error(entity, err) {
    releaseRecorder()
    entity.is_recording = false
    entity.audio_error = err?.message ?? "errors.micUnavailable"
  },
})

export function audioTick(entity, _, api) {
  if (!entity.is_recording) return
  entity.audio_elapsed = (entity.audio_elapsed ?? NO_TIME_RECORDED) + ONE_SECOND
  if (entity.audio_elapsed >= AUDIO_MAX_SECONDS) {
    api.notify(`#${entity.id}:audioRecordStop`)
  }
}

export function audioRecordStop(entity, _, api) {
  stopTick("audio")
  if (!mediaRecorder || mediaRecorder.state === "inactive") return
  const id = entity.id
  entity.is_recording = false
  mediaRecorder.onstop = async () => {
    const type = mediaRecorder.mimeType || "audio/webm"
    const durationMs =
      recordStartedAt == null ? null : Date.now() - recordStartedAt
    recordStartedAt = null
    let blob = new Blob(audioChunks, { type })
    audioChunks = []
    if (blob.type.includes("webm") && durationMs != null) {
      try {
        blob = await fixWebmDuration(blob, durationMs, { logger: false })
      } catch {
        // Keep the raw blob: transcription still works, only duration suffers.
      }
    }
    pendingBlob = blob
    if (mediaStream) {
      for (const track of mediaStream.getTracks()) track.stop()
      mediaStream = null
    }
    mediaRecorder = null
    if (!pendingBlob || pendingBlob.size < MIN_AUDIO_BYTES) {
      pendingBlob = null
      api.notify(`#${id}:audioEmpty`)
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = URL.createObjectURL(pendingBlob)
    api.notify(`#${id}:audioClipReady`, { url: previewUrl })
  }
  mediaRecorder.stop()
}

export function audioEmpty(entity) {
  entity.audio_preview_url = null
  entity.audio_transcript = null
  entity.audio_error = "errors.emptyRecording"
}

export function audioOpen(entity) {
  entity.is_audio_open = true
  entity.audio_error = null
}

export function audioCancel(entity) {
  releaseRecorder()
  entity.is_recording = false
  entity.is_audio_open = false
  entity.audio_error = null
}

// The results that arrive later are ignored: the user may be typing by then.
export function voiceWaitDismiss(entity) {
  entity.is_voice_wait_dismissed = true
}

export function audioClipReady(entity, { url }, api) {
  entity.audio_preview_url = url
  entity.audio_transcript = null
  entity.audio_error = null
  api.notify(`#${entity.id}:audioProcess`)
}

export const audioProcess = handleAsync("audioProcess", {
  start(entity) {
    entity.is_transcribing = true
    entity.is_voice_wait_dismissed = false
    entity.audio_error = null
  },
  run() {
    if (!pendingBlob) throw new Error("errors.noAudio")
    return transcribeAudio(pendingBlob)
  },
  success(entity, transcript, api) {
    entity.is_transcribing = false
    entity.audio_transcript = transcript || null
    if (transcript && !entity.is_voice_wait_dismissed) {
      const job_type = jobTypeId(
        getFieldValue(entity, "category", ""),
        getFieldValue(entity, "profession", ""),
      )
      const mine = api.getEntity("eventList")?.professions ?? []
      api.notify(`#${entity.id}:audioParse`, {
        text: transcript,
        form: {
          job_type,
          // An edit can be on a job type the poster no longer offers.
          job_types: [
            job_type,
            ...jobTypesFor([...mine]).map((jobType) => jobType.id),
          ],
        },
      })
    }
  },
  error(entity, err) {
    entity.is_transcribing = false
    entity.audio_transcript = null
    entity.audio_error =
      err?.message === "errors.voiceLimit" || err?.message === "errors.noAudio"
        ? err.message
        : "errors.transcriptionFailed"
  },
})

export const audioParse = handleAsync("audioParse", {
  start(entity) {
    entity.is_parsing = true
  },
  run({ text, form }) {
    return parseEvent(text, form)
  },
  success(entity, fields, api) {
    entity.is_parsing = false
    if (entity.is_voice_wait_dismissed) return
    if (!fields || typeof fields !== "object") return
    if (fields.job_type && jobTypeById(fields.job_type)) {
      jobTypeSelect(entity, { value: fields.job_type }, api)
      api.notify("#jobTypeCreate:valueSet", fields.job_type)
    }
    const category = categoryById(getFieldValue(entity, "category", ""))
    const details = mergeParsedDetails(
      category,
      getFieldValue(entity, "details", {}),
      fields.details,
    )
    if (category.title_from.input && fields.title) {
      Form.fieldChange(entity, { path: "title", value: fields.title })
    }
    Form.fieldChange(entity, { path: "details", value: details })
    const currency = getFieldValue(entity, "pay_currency", DEFAULT_CURRENCY)
    if (fields.pay) {
      const pay = { ...fields.pay, currency: fields.pay.currency ?? currency }
      for (const [path, value] of Object.entries(payToForm(pay))) {
        Form.fieldChange(entity, { path, value })
      }
    }
    const previousCountry = getFieldValue(entity, "country", "")
    if (typeof fields.location === "string" && fields.location.trim()) {
      Form.fieldChange(entity, {
        path: "location",
        value: fields.location.trim(),
      })
    }
    if (typeof fields.country === "string" && fields.country.trim()) {
      Form.fieldChange(entity, {
        path: "country",
        value: fields.country.trim(),
      })
    }
    if (typeof fields.region === "string" && fields.region.trim()) {
      Form.fieldChange(entity, {
        path: "region",
        value: fields.region.trim(),
      })
    }
    const country = getFieldValue(entity, "country", "")
    const region = regionAfterCountryChange(
      previousCountry,
      country,
      getFieldValue(entity, "region", ""),
    )
    Form.fieldChange(entity, { path: "region", value: region })
    if (!fields.pay?.currency) {
      Form.fieldChange(entity, {
        path: "pay_currency",
        value: currencyAfterCountryChange(previousCountry, country, currency),
      })
    }
    api.notify("#countryCreate:valueSet", country)
    api.notify("#regionCreate:valueSet", region)
    api.notify("#styleCreate:valueSet", details.style ?? "")
    api.notify("#genreCreate:valueSet", details.genre ?? "")
    if (
      typeof fields.event_date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(fields.event_date)
    ) {
      Form.fieldChange(entity, {
        path: "event_date",
        value: fields.event_date,
      })
      autofillDeadline(entity)
    }
  },
  error(entity, err) {
    entity.is_parsing = false
    if (entity.is_voice_wait_dismissed) return
    entity.audio_error =
      err?.message === "errors.voiceLimit"
        ? "errors.voiceLimit"
        : "errors.parseFailed"
  },
})

export function clearEventImages(entity) {
  closeCrop(entity)
  revokePreview(entity.pending_cover)
  for (const item of entity.pending_gallery ?? []) revokePreview(item)
  entity.cover_url = null
  entity.gallery_urls = []
  entity.pending_cover = null
  entity.pending_gallery = []
  entity.loaded_image_urls = []
  entity.image_error = null
}

export function imagesAdd(entity, { files } = {}) {
  const incoming = [...(files ?? [])]
  entity.image_error = null
  const galleryMax = MAX_EVENT_IMAGES - COVER_IMAGES
  const pending = [...(entity.pending_gallery ?? [])]
  const saved = entity.gallery_urls ?? []
  let room = galleryMax - saved.length - pending.length
  if (room <= NO_ROOM) {
    entity.image_error = {
      key: "errors.imageLimit",
      values: { count: galleryMax },
    }
    return
  }
  for (const file of incoming) {
    if (room <= NO_ROOM) {
      entity.image_error = {
        key: "errors.imageLimit",
        values: { count: galleryMax },
      }
      break
    }
    const next = readImageFile(entity, file)
    if (!next) continue
    pending.push(next)
    room--
  }
  entity.pending_gallery = pending
}

export function imagesRemove(entity, { id, url, slot } = {}) {
  entity.image_error = null
  if (slot === "cover" || (id && entity.pending_cover?.id === id)) {
    if (id && entity.pending_cover?.id === id) {
      revokePreview(entity.pending_cover)
      entity.pending_cover = null
      return
    }
    if (url && url === entity.cover_url) entity.cover_url = null
    return
  }
  if (id) {
    const item = (entity.pending_gallery ?? []).find((photo) => photo.id === id)
    revokePreview(item)
    entity.pending_gallery = (entity.pending_gallery ?? []).filter(
      (photo) => photo.id !== id,
    )
    return
  }
  if (!url) return
  entity.gallery_urls = (entity.gallery_urls ?? []).filter(
    (item) => item !== url,
  )
}

export function coverCropOpen(entity, { file, rect = null } = {}, api) {
  entity.image_error = null
  entity.cropError = null
  if (!imageExtension(file?.type)) {
    entity.image_error = "errors.imageType"
    return
  }
  if (file.size > IMAGE_MAX_BYTES) {
    entity.image_error = "errors.imageSize"
    return
  }
  revokeCropPreview(entity)
  cropSessionFile = file
  entity.cropPreviewUrl = URL.createObjectURL(file)
  entity.isCropOpen = true
  entity.isCropSaving = false
  api.notify(`#${COVER_CROPPER}:srcChange`, {
    src: entity.cropPreviewUrl,
    rect,
  })
}

export function coverCropCancel(entity) {
  if (entity.isCropSaving) return
  closeCrop(entity)
}

export const coverCropEdit = handleAsync("coverCropEdit", {
  start(entity) {
    entity.image_error = null
  },
  async run({ id, url, rect = null }) {
    const sourceFile = pendingSourceFile(id)
    if (sourceFile instanceof File) return { file: sourceFile, rect }
    if (!url) throw new Error("errors.imageCrop")
    let response
    try {
      response = await fetch(url)
    } catch {
      throw new Error("errors.imageCrop")
    }
    if (!response.ok) throw new Error("errors.imageCrop")
    const blob = await response.blob()
    const type = blob.type || IMAGE_JPEG_TYPE
    if (!imageExtension(type)) throw new Error("errors.imageType")
    return { file: createImageFile(blob, "cover.jpg"), rect: null }
  },
  success(entity, crop, api) {
    coverCropOpen(entity, crop, api)
  },
  error(entity, err) {
    entity.image_error = err.message ?? "errors.imageCrop"
  },
})

export const coverCropConfirm = handleAsync("coverCropConfirm", {
  start(entity) {
    entity.isCropSaving = true
    entity.cropError = null
  },
  async run({ rect }) {
    const file = cropSessionFile
    if (!file || !rect) throw new Error("errors.imageCrop")
    try {
      const blob = await cropImage(file, rect, {
        maxWidth: COVER_OUTPUT_WIDTH,
        maxHeight: COVER_OUTPUT_HEIGHT,
      })
      return { blob, sourceFile: file, rect }
    } catch {
      throw new Error("errors.imageCrop")
    }
  },
  success(entity, { blob, sourceFile, rect }) {
    const file = createImageFile(blob, "cover.jpg")
    revokePreview(entity.pending_cover)
    entity.cover_url = null
    const id = randomId()
    rememberPendingFiles(id, { file, sourceFile })
    entity.pending_cover = {
      id,
      previewUrl: URL.createObjectURL(file),
      rect,
    }
    entity.image_error = null
    closeCrop(entity)
  },
  error(entity, err) {
    entity.cropError = err.message ?? "errors.imageCrop"
  },
  finally(entity) {
    entity.isCropSaving = false
  },
})

export function audioRemove(entity) {
  releaseRecorder()
  clearPendingAudio()
  entity.is_recording = false
  entity.is_audio_open = false
  entity.is_transcribing = false
  entity.is_parsing = false
  entity.audio_preview_url = null
  entity.audio_transcript = null
  entity.audio_error = null
}

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run(event) {
    const photos = await savedImageUrls(event)
    const deadlineIso =
      event.application_deadline.length === DATETIME_LOCAL_LENGTH
        ? new Date(event.application_deadline).toISOString()
        : event.application_deadline
    const payload = {
      category: event.category,
      profession: event.profession,
      title: event.title,
      location: event.location,
      country: event.country,
      region: event.region,
      event_date: event.event_date,
      application_deadline: deadlineIso,
      max_applicants: Number(event.max_applicants) || DEFAULT_MAX_APPLICANTS,
      image_urls: photos.image_urls,
      details: event.details,
      pay: event.pay,
    }
    let saved
    try {
      saved = await writeEvent(event, payload)
    } catch (err) {
      await forgetImages(photos.uploadedPaths)
      throw err
    }
    await forgetImages(droppedImagePaths(event, photos.image_urls))
    return saved
  },
  success(entity, _, api) {
    entity.status = "ready"
    clearPendingAudio()
    clearEventImages(entity)
    entity.audio_preview_url = null
    api.notify("#eventList:load")
    api.notify(
      "#router:navigate",
      entity.editing_event_id
        ? paths.event(entity.editing_event_id)
        : paths.myEvents,
    )
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "errors.saveEvent"
  },
})

export const editLoad = handleAsync("editLoad", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run(event_id) {
    return fetchEventForEdit(event_id)
  },
  success(entity, row, api) {
    entity.status = "ready"
    const country = row.country ?? ""
    const region = regionForCountry(row.country, row.region)
    entity.values = {
      category: row.category ?? "wedding",
      profession: row.profession ?? "",
      title: row.title ?? "",
      location: row.location ?? "",
      country,
      region,
      event_date: row.event_date ?? "",
      application_deadline: toLocalInput(row.application_deadline),
      max_applicants: row.max_applicants ?? DEFAULT_MAX_APPLICANTS,
      details: row.details ?? {},
      ...payToForm(row.event_pay),
    }
    entity.errors = {}
    entity.isValid = true
    const photos = [...(row.image_urls ?? [])]
    entity.cover_url = photos[COVER_INDEX] ?? null
    entity.gallery_urls = photos.slice(COVER_IMAGES)
    entity.loaded_image_urls = photos
    entity.pending_cover = null
    entity.pending_gallery = []
    entity.image_error = null
    entity.audio_preview_url = null
    entity.is_recording = false
    entity.is_audio_open = false
    entity.audio_transcript = null
    entity.audio_error = null
    api.notify("#countryCreate:valueSet", country)
    api.notify("#regionCreate:valueSet", region)
    api.notify("#styleCreate:valueSet", row.details?.style ?? "")
    api.notify("#genreCreate:valueSet", row.details?.genre ?? "")
    jobTypeOptionsSync(entity, null, api)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "errors.loadEvent"
  },
})

function shiftDate(dateStr, days) {
  const [year, month, day] = dateStr.split("-").map(Number)
  const shifted = new Date(Date.UTC(year, month - MONTH_INDEX_OFFSET, day))
  shifted.setUTCDate(shifted.getUTCDate() - days)
  return shifted.toISOString().slice(FIRST_INDEX, DATE_ISO_LENGTH)
}

// UTC ISO from the DB back to local "YYYY-MM-DDTHH:MM" for datetime-local.
// Without this, 17:30 local saved as 15:30Z shows back as 15:30.
function toLocalInput(iso) {
  if (typeof iso !== "string" || !iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value) => String(value).padStart(PAD_LENGTH, "0")
  const month = pad(date.getMonth() + MONTH_INDEX_OFFSET)
  const day = pad(date.getDate())
  return `${date.getFullYear()}-${month}-${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function autofillDeadline(entity) {
  const eventDate = getFieldValue(entity, "event_date", "")
  if (
    getFieldValue(entity, "application_deadline", "") ||
    !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
  ) {
    return
  }
  const candidate = `${shiftDate(eventDate, APPLICATION_DEADLINE_LEAD_DAYS)}T${DEADLINE_END_OF_DAY}`
  if (new Date(candidate).getTime() > Date.now()) {
    Form.fieldChange(entity, {
      path: "application_deadline",
      value: candidate,
    })
  }
}

function revokePreview(item) {
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
  if (item?.id) forgetPendingFiles(item.id)
}

// Removed photos are deleted only once the row stops pointing at them: an
// orphan in the bucket is harmless, a dead link is not.
function droppedImagePaths(event, image_urls) {
  return droppedImageUrls(event.loaded_image_urls, image_urls)
    .map(imageRefFromUrl)
    .filter((ref) => ref?.bucket === EVENT_IMAGES_BUCKET)
    .map((ref) => ref.path)
}

function rememberPendingFiles(id, { file = null, sourceFile = null } = {}) {
  if (!id) return
  pendingImageFiles.set(id, { file, sourceFile })
}

function forgetPendingFiles(id) {
  if (id) pendingImageFiles.delete(id)
}

function pendingFile(id) {
  return pendingImageFiles.get(id)?.file ?? null
}

function pendingSourceFile(id) {
  return pendingImageFiles.get(id)?.sourceFile ?? null
}

function readImageFile(entity, file) {
  if (!imageExtension(file?.type)) {
    entity.image_error = "errors.imageType"
    return null
  }
  if (file.size > IMAGE_MAX_BYTES) {
    entity.image_error = "errors.imageSize"
    return null
  }
  const id = randomId()
  rememberPendingFiles(id, { file })
  return {
    id,
    previewUrl: URL.createObjectURL(file),
  }
}

function revokeCropPreview(entity) {
  if (entity.cropPreviewUrl) URL.revokeObjectURL(entity.cropPreviewUrl)
}

function closeCrop(entity) {
  revokeCropPreview(entity)
  cropSessionFile = null
  entity.isCropOpen = false
  entity.cropPreviewUrl = null
  entity.cropError = null
  entity.isCropSaving = false
}

async function forgetImages(paths) {
  for (const path of paths) {
    try {
      await deleteEventImage(path)
    } catch {
      // An orphaned file stays in the bucket. The row is what the page shows.
    }
  }
}

async function savedImageUrls(event) {
  const uploaded = []
  try {
    const coverBlob = event.pending_cover?.id
      ? pendingFile(event.pending_cover.id)
      : null
    const coverUpload = coverBlob ? await uploadEventImage(coverBlob) : null
    if (coverUpload) uploaded.push(coverUpload)

    const galleryUploads = []
    for (const item of event.pending_gallery ?? []) {
      const blob = pendingFile(item.id)
      if (!blob) continue
      const file = await uploadEventImage(blob)
      galleryUploads.push(file)
      uploaded.push(file)
    }

    const cover = coverUpload?.url ?? event.cover_url ?? null
    const gallery = [
      ...(event.gallery_urls ?? []),
      ...galleryUploads.map((file) => file.url),
    ]
    return {
      image_urls: cover ? [cover, ...gallery] : gallery,
      uploadedPaths: uploaded.map((file) => file.path),
    }
  } catch (err) {
    await forgetImages(uploaded.map((file) => file.path))
    throw err
  }
}

function writeEvent(event, payload) {
  return event.editing_event_id
    ? updateEvent(event.editing_event_id, payload)
    : createEvent(payload)
}
