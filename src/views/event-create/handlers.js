import { handleAsync } from "@inglorious/store/async"
import { Form, getFieldValue } from "@inglorious/web/form"
import fixWebmDuration from "fix-webm-duration"

import {
  createEvent,
  deleteEventAudio,
  fetchEventForEdit,
  parseEvent,
  transcribeAudio,
  updateEvent,
  uploadEventAudio,
} from "../../api/events.js"
import {
  deleteEventImage,
  EVENT_IMAGES_BUCKET,
  imageExtension,
  imageRefFromUrl,
  uploadEventImage,
} from "../../api/images.js"
import { stopTick } from "../../api/ticker.js"
import {
  createImageFile,
  cropToBlob,
  decodeImage,
  sourceSize,
} from "../../common/image.js"
import {
  APPLICATION_DEADLINE_LEAD_DAYS,
  AUDIO_MAX_SECONDS,
  COVER_PAN_STEP,
  COVER_SCALE_STEP,
  COVER_WHEEL_ZOOM_RATE,
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
  PAD_LENGTH,
  SINGULAR,
  ZERO,
} from "../../constants/index.js"
import { weddingStyles } from "../../data/event-taxonomy.js"
import {
  regionAfterCountryChange,
  regionForCountry,
} from "../../data/regions/resolve.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { randomId } from "../../text/index.js"
import {
  applyCropPan,
  applyCropResize,
  clampCropRect,
  cropHitTest,
  cropOutputSize,
  cropSourceRect,
  defaultCropRect,
  readCropRect,
  scaleCropRect,
  writeCropRect,
} from "./helpers.js"

// Module-scope recorder state (never in the entity: not serializable).
let mediaRecorder = null
let mediaStream = null
let audioChunks = []
let pendingBlob = null
let previewUrl = null
let pendingPath = null
let pendingUrl = null
let removedPath = null
let recordStartedAt = null

function audioPathFromUrl(url) {
  if (typeof url !== "string") return null
  const [, path] = url.split("/event-audio/")
  return path ?? null
}

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
  pendingPath = null
  pendingUrl = null
  removedPath = null
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
}

// Drops the un-saved take; deletes its bucket file when asked.
// Keeps the preview URL when the current take still needs its player.
async function dropPendingAudio(deleteFile, keepPreview = false) {
  const path = pendingPath
  pendingBlob = null
  pendingPath = null
  pendingUrl = null
  if (!keepPreview && previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
  if (deleteFile && path) {
    try {
      await deleteEventAudio(path)
    } catch {
      // Orphan file stays in the bucket; harmless for the spike.
    }
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
    api?.notify("#region-create:sync", region)
  } else {
    Form.fieldChange(entity, { path: field, value })
  }
  entity.error = null
}

function shiftDate(dateStr, days) {
  const [year, month, day] = dateStr.split("-").map(Number)
  const shifted = new Date(Date.UTC(year, month - SINGULAR, day))
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

// Wedding default: deadline ~45 days before the event, end of day.
// Only fills when empty (never overwrites the sender) and never in the past.
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

export function eventDateSet(entity, { value }) {
  Form.fieldChange(entity, { path: "event_date", value })
  entity.error = null
  autofillDeadline(entity)
}

export function detailFieldSet(entity, { field, value }) {
  Form.fieldChange(entity, { path: `details.${field}`, value })
  entity.error = null
}

export function categorySelect(entity, category, api) {
  Form.fieldChange(entity, { path: "category", value: category })
  Form.fieldChange(entity, { path: "details", value: {} })
  entity.errors = {}
  entity.isValid = true
  entity.error = null
  // Clearing the form's errors has to clear the comboboxes' too, or a message
  // outlives the thing that caused it.
  api.notify("#country-create:errorSet", null)
  api.notify("#region-create:errorSet", null)
  api.notify("#style-create:sync", "")
  api.notify("#genre-create:sync", "")
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
      if (e.data.size > ZERO) audioChunks.push(e.data)
    }
    mediaRecorder.start()
    recordStartedAt = Date.now()
    return true
  },
  success(entity) {
    entity.is_recording = true
    entity.audio_elapsed = ZERO
  },
  error(entity, err) {
    releaseRecorder()
    entity.is_recording = false
    entity.audio_error = err?.message ?? t("errors.micUnavailable")
  },
})

export function audioTick(entity, _, api) {
  if (!entity.is_recording) return
  entity.audio_elapsed = (entity.audio_elapsed ?? ZERO) + SINGULAR
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
        // Firefox omits Duration in WebM — the player shows 0:00 and stalls.
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
  entity.audio_error = t("errors.emptyRecording")
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

export function audioClipReady(entity, { url }, api) {
  entity.audio_preview_url = url
  entity.audio_transcript = null
  entity.audio_error = null
  api.notify(`#${entity.id}:audioProcess`)
}

// Uploads the fresh take (dropping any previous one), then transcribes it
// on the server. Save reuses the result — no second upload.
export const audioProcess = handleAsync("audioProcess", {
  start(entity) {
    entity.is_transcribing = true
    entity.audio_error = null
  },
  async run() {
    if (!pendingBlob) throw new Error(t("errors.noAudio"))
    const blob = pendingBlob
    await dropPendingAudio(true, true)
    pendingBlob = blob
    const uploaded = await uploadEventAudio(blob)
    pendingPath = uploaded.path
    pendingUrl = uploaded.url
    return { transcript: await transcribeAudio(pendingPath), url: pendingUrl }
  },
  success(entity, { transcript, url }, api) {
    entity.is_transcribing = false
    // Stable bucket URL from now on — the object URL dies with the swap.
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      previewUrl = null
    }
    entity.audio_preview_url = url
    entity.audio_transcript = transcript || null
    if (transcript) api.notify(`#${entity.id}:audioParse`, { text: transcript })
  },
  error(entity, err) {
    entity.is_transcribing = false
    entity.audio_transcript = null
    entity.audio_error = err?.message ?? t("errors.transcriptionFailed")
  },
})

const FILLABLE_DETAILS = ["spouse_first_name_1", "spouse_first_name_2", "style"]

// Fills empty inputs from the parsed transcript. Never overwrites the sender.
export const audioParse = handleAsync("audioParse", {
  start(entity) {
    entity.is_parsing = true
  },
  async run({ text }) {
    return parseEvent(text)
  },
  success(entity, fields, api) {
    entity.is_parsing = false
    if (!fields || typeof fields !== "object") return
    const details = { ...getFieldValue(entity, "details", {}) }
    for (const field of FILLABLE_DETAILS) {
      const value = fields[field]
      if (typeof value !== "string" || !value.trim()) continue
      if (field === "style" && !weddingStyles.some((s) => s.value === value)) {
        continue
      }
      details[field] = value.trim()
    }
    Form.fieldChange(entity, { path: "details", value: details })
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
    api.notify("#country-create:sync", country)
    api.notify("#region-create:sync", region)
    api.notify("#style-create:sync", details.style ?? "")
    api.notify("#genre-create:sync", details.genre ?? "")
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
  error(entity) {
    entity.is_parsing = false
  },
})
function revokePreview(item) {
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
  if (item?.id) forgetPendingFiles(item.id)
}

// Drop a saved event photo from the bucket as soon as it leaves the form.
// Waiting until save left orphans whenever the user removed a photo and then
// navigated away without saving.
function forgetImageUrl(url) {
  const ref = imageRefFromUrl(url)
  if (!ref || ref.bucket !== EVENT_IMAGES_BUCKET) return
  void deleteEventImage(ref.path).catch(() => {})
}

// File blobs stay outside the entity (not serialisable store data). The entity
// only keeps id + previewUrl + crop fractions.
/** @type {Map<string, { file: File | null, sourceFile: File | null }>} */
const pendingImageFiles = new Map()
/** @type {File | null} */
let cropSessionFile = null

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
    entity.image_error = t("errors.imageType")
    return null
  }
  if (file.size > IMAGE_MAX_BYTES) {
    entity.image_error = t("errors.imageSize")
    return null
  }
  const id = randomId()
  rememberPendingFiles(id, { file })
  return {
    id,
    previewUrl: URL.createObjectURL(file),
  }
}

// The crop dialog is transient: its source preview URL and active pointers are
// not part of the saved event. Keeping them outside the entity also stops every
// pointer move from being serialised into the store.
/** @type {Map<number, { x: number, y: number }>} */
let cropPointers = new Map()
/** @type {number | null} */
let cropPinchDistance = null
/** @type {{ mode: string, handle: string | null, start: object } | null} */
let cropDrag = null

function clearCropPointers() {
  cropPointers.clear()
  cropPinchDistance = null
  cropDrag = null
}

function pinchDistance() {
  const points = [...cropPointers.values()]
  if (points.length < 2) return null
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
}

function resetCropRect(entity) {
  writeCropRect(entity, defaultCropRect())
}

function revokeCropPreview(entity) {
  if (entity.cropPreviewUrl) URL.revokeObjectURL(entity.cropPreviewUrl)
}

function closeCrop(entity) {
  revokeCropPreview(entity)
  clearCropPointers()
  cropSessionFile = null
  entity.isCropOpen = false
  entity.hasCropFile = false
  entity.cropPreviewUrl = null
  entity.cropImageWidth = 0
  entity.cropImageHeight = 0
  entity.cropRestoreRect = null
  entity.cropAllowFullPhoto = false
  resetCropRect(entity)
  entity.cropError = null
  entity.isCropSaving = false
  entity.isCropDragging = false
}

export function clearEventImages(entity) {
  closeCrop(entity)
  revokePreview(entity.pending_cover)
  for (const item of entity.pending_gallery ?? []) revokePreview(item)
  entity.cover_url = null
  entity.gallery_urls = []
  entity.pending_cover = null
  entity.pending_gallery = []
  entity.image_error = null
}

// Gallery photos only show inside the event. The cover is handled by
// coverCropOpen/coverCropConfirm so it can be framed first.
export function imagesAdd(entity, { files } = {}) {
  const incoming = [...(files ?? [])]
  entity.image_error = null
  const galleryMax = MAX_EVENT_IMAGES - SINGULAR
  const pending = [...(entity.pending_gallery ?? [])]
  const saved = entity.gallery_urls ?? []
  let room = galleryMax - saved.length - pending.length
  if (room <= ZERO) {
    entity.image_error = t("errors.imageLimit", { count: galleryMax })
    return
  }
  for (const file of incoming) {
    if (room <= ZERO) {
      entity.image_error = t("errors.imageLimit", { count: galleryMax })
      break
    }
    const next = readImageFile(entity, file)
    if (!next) continue
    pending.push(next)
    room -= SINGULAR
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
    if (url && url === entity.cover_url) {
      forgetImageUrl(url)
      entity.cover_url = null
    }
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
  forgetImageUrl(url)
}

export function coverCropOpen(
  entity,
  file,
  { rect = null, allowFullPhoto = true } = {},
) {
  entity.image_error = null
  entity.cropError = null
  if (!imageExtension(file?.type)) {
    entity.image_error = t("errors.imageType")
    return
  }
  if (file.size > IMAGE_MAX_BYTES) {
    entity.image_error = t("errors.imageSize")
    return
  }
  revokeCropPreview(entity)
  clearCropPointers()
  cropSessionFile = file
  entity.hasCropFile = true
  entity.cropPreviewUrl = URL.createObjectURL(file)
  entity.cropImageWidth = 0
  entity.cropImageHeight = 0
  entity.cropAllowFullPhoto = allowFullPhoto
  entity.cropRestoreRect = rect ? clampCropRect(rect) : null
  resetCropRect(entity)
  entity.isCropOpen = true
  entity.isCropSaving = false
  entity.isCropDragging = false
}

export function coverCropImageLoad(entity, { width, height } = {}) {
  if (!width || !height) {
    entity.cropImageWidth = 0
    entity.cropImageHeight = 0
    entity.cropError = t("errors.imageCrop")
    return
  }
  entity.cropImageWidth = width
  entity.cropImageHeight = height
  if (entity.cropRestoreRect) {
    writeCropRect(entity, entity.cropRestoreRect)
    entity.cropRestoreRect = null
  } else {
    resetCropRect(entity)
  }
  entity.cropError = null
}

export function coverCropWheel(entity, deltaY) {
  if (entity.isCropSaving || !deltaY || !entity.cropImageWidth) return
  // Scroll up → larger crop area (same sense as pinch-out).
  const factor = Math.exp(deltaY * COVER_WHEEL_ZOOM_RATE)
  writeCropRect(entity, scaleCropRect(readCropRect(entity), factor))
  entity.cropError = null
}

export function coverCropKeyDown(entity, { key } = {}) {
  if (entity.isCropSaving || !entity.cropImageWidth) return
  const rect = readCropRect(entity)
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const direction = key === "ArrowLeft" ? -SINGULAR : SINGULAR
    writeCropRect(entity, applyCropPan(rect, direction * COVER_PAN_STEP, 0))
    return
  }
  if (key === "ArrowUp" || key === "ArrowDown") {
    const direction = key === "ArrowUp" ? -SINGULAR : SINGULAR
    writeCropRect(entity, applyCropPan(rect, 0, direction * COVER_PAN_STEP))
    return
  }
  if (key === "+" || key === "=") {
    writeCropRect(entity, scaleCropRect(rect, SINGULAR + COVER_SCALE_STEP))
    return
  }
  if (key === "-" || key === "_") {
    writeCropRect(entity, scaleCropRect(rect, SINGULAR - COVER_SCALE_STEP))
  }
}

export function coverCropPointerDown(
  entity,
  { pointerId, clientX, clientY, width, height, localX, localY } = {},
) {
  if (entity.isCropSaving || pointerId == null) return
  cropPointers.set(pointerId, { x: clientX, y: clientY })
  entity.isCropDragging = true
  entity.cropError = null

  if (cropPointers.size >= 2) {
    cropPinchDistance = pinchDistance()
    cropDrag = null
    return
  }

  if (!width || !height) return
  const nx = localX != null ? localX / width : 0
  const ny = localY != null ? localY / height : 0
  const hit = cropHitTest(nx, ny, readCropRect(entity), width, height)
  if (!hit) {
    cropDrag = null
    return
  }
  cropDrag = {
    mode: hit === "move" ? "move" : "resize",
    handle: hit === "move" ? null : hit,
    start: readCropRect(entity),
    originX: nx,
    originY: ny,
  }
}

export function coverCropPointerMove(
  entity,
  { pointerId, clientX, clientY, width, height, localX, localY } = {},
) {
  if (!cropPointers.has(pointerId) || !width || !height) return
  cropPointers.set(pointerId, { x: clientX, y: clientY })

  if (cropPointers.size >= 2) {
    const distance = pinchDistance()
    // Spread → larger crop area; pinch in → tighter.
    if (cropPinchDistance && distance) {
      writeCropRect(
        entity,
        scaleCropRect(
          readCropRect(entity),
          distance / cropPinchDistance,
        ),
      )
      cropPinchDistance = distance
    }
    return
  }

  if (!cropDrag) return
  const nx = localX != null ? localX / width : clientX / width
  const ny = localY != null ? localY / height : clientY / height
  const dx = nx - cropDrag.originX
  const dy = ny - cropDrag.originY

  if (cropDrag.mode === "resize" && cropDrag.handle) {
    writeCropRect(
      entity,
      applyCropResize(cropDrag.start, cropDrag.handle, dx, dy),
    )
    return
  }

  writeCropRect(entity, applyCropPan(cropDrag.start, dx, dy))
}

export function coverCropPointerEnd(entity, { pointerId } = {}) {
  if (pointerId != null) cropPointers.delete(pointerId)
  else clearCropPointers()

  if (cropPointers.size >= 2) {
    cropPinchDistance = pinchDistance()
    return
  }

  cropPinchDistance = null
  cropDrag = null
  if (cropPointers.size === 0) entity.isCropDragging = false
}

export function coverCropCancel(entity) {
  if (entity.isCropSaving) return
  closeCrop(entity)
}

// Re-open on the original source photo (not the cropped output) and restore
// the last frame when we still have it on pending_cover.
export const coverCropEdit = handleAsync("coverCropEdit", {
  start(entity) {
    entity.image_error = null
  },
  async run({ id, url, cropX, cropY, cropW, cropH } = {}) {
    const rect =
      cropW != null && cropH != null
        ? { x: cropX ?? 0, y: cropY ?? 0, w: cropW, h: cropH }
        : null
    const sourceFile = pendingSourceFile(id)
    if (sourceFile instanceof File) {
      return { file: sourceFile, rect, allowFullPhoto: true }
    }
    const file = pendingFile(id)
    if (file instanceof File) {
      // Display file only — already cropped or full with no separate original.
      return { file, rect, allowFullPhoto: false }
    }
    if (!url) throw new Error(t("errors.imageCrop"))
    let response
    try {
      response = await fetch(url)
    } catch {
      throw new Error(t("errors.imageCrop"))
    }
    if (!response.ok) throw new Error(t("errors.imageCrop"))
    const blob = await response.blob()
    const type = blob.type || IMAGE_JPEG_TYPE
    if (!imageExtension(type)) throw new Error(t("errors.imageType"))
    return {
      file: createImageFile(blob, "cover.jpg"),
      rect: null,
      allowFullPhoto: false,
    }
  },
  success(entity, { file, rect, allowFullPhoto }) {
    coverCropOpen(entity, file, { rect, allowFullPhoto })
  },
  error(entity, err) {
    entity.image_error = err.message ?? t("errors.imageCrop")
  },
})

// Keep the original file as the cover — no crop, no recompress.
export function coverCropUseOriginal(entity) {
  if (entity.isCropSaving || !entity.cropAllowFullPhoto) return
  const file = cropSessionFile
  if (!file) return
  entity.image_error = null
  revokePreview(entity.pending_cover)
  if (entity.cover_url) forgetImageUrl(entity.cover_url)
  entity.cover_url = null
  const id = randomId()
  rememberPendingFiles(id, { file, sourceFile: file })
  entity.pending_cover = {
    id,
    previewUrl: URL.createObjectURL(file),
    ...defaultCropRectAsFields(),
  }
  closeCrop(entity)
}

function defaultCropRectAsFields() {
  const rect = defaultCropRect()
  return { cropX: rect.x, cropY: rect.y, cropW: rect.w, cropH: rect.h }
}

export const coverCropConfirm = handleAsync("coverCropConfirm", {
  start(entity) {
    entity.isCropSaving = true
    entity.cropError = null
  },
  async run({ cropX, cropY, cropW, cropH } = {}) {
    const file = cropSessionFile
    if (!file) throw new Error(t("errors.imageCrop"))
    let source
    try {
      source = await decodeImage(file)
    } catch {
      throw new Error(t("errors.imageCrop"))
    }
    try {
      const { width, height } = sourceSize(source)
      const rect = cropSourceRect(width, height, {
        x: cropX,
        y: cropY,
        w: cropW,
        h: cropH,
      })
      const size = cropOutputSize(rect.sw, rect.sh)
      const blob = await cropToBlob(source, rect, size)
      return { blob, sourceFile: file, cropX, cropY, cropW, cropH }
    } catch {
      throw new Error(t("errors.imageCrop"))
    } finally {
      source.close?.()
    }
  },
  success(entity, { blob, sourceFile, cropX, cropY, cropW, cropH }) {
    const file = createImageFile(blob, "cover.jpg")
    revokePreview(entity.pending_cover)
    if (entity.cover_url) forgetImageUrl(entity.cover_url)
    entity.cover_url = null
    const id = randomId()
    rememberPendingFiles(id, {
      file,
      sourceFile: sourceFile ?? null,
    })
    entity.pending_cover = {
      id,
      previewUrl: URL.createObjectURL(file),
      cropX,
      cropY,
      cropW,
      cropH,
    }
    entity.image_error = null
    closeCrop(entity)
  },
  error(entity, err) {
    entity.cropError = err.message ?? t("errors.imageCrop")
  },
  finally(entity) {
    entity.isCropSaving = false
  },
})

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
    // A failure halfway through used to leave the already-uploaded gallery
    // behind when the cover was the file that failed.
    await forgetImages(uploaded.map((file) => file.path))
    throw err
  }
}

export function audioRemove(entity) {
  releaseRecorder()
  if (entity.audio_url) removedPath = audioPathFromUrl(entity.audio_url)
  entity.is_recording = false
  entity.is_audio_open = false
  entity.is_transcribing = false
  entity.is_parsing = false
  entity.audio_preview_url = null
  entity.audio_url = null
  entity.audio_transcript = null
  entity.audio_error = null
  void dropPendingAudio(true)
}

async function writeEvent(event, payload, audio_url) {
  if (!event.editing_event_id) return createEvent(payload)
  const previous = typeof event.audio_url === "string" ? event.audio_url : null
  const result = await updateEvent(event.editing_event_id, payload)
  const replaced = pendingBlob && previous && previous !== audio_url
  if (replaced) {
    const oldPath = audioPathFromUrl(previous)
    if (oldPath) {
      try {
        await deleteEventAudio(oldPath)
      } catch {
        // Orphan file stays in the bucket; harmless for the spike.
      }
    }
  } else if (!pendingBlob && !previous && removedPath) {
    try {
      await deleteEventAudio(removedPath)
    } catch {
      // Orphan file stays in the bucket; harmless for the spike.
    }
  }
  return result
}

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run(event) {
    let audio_url
    let transcript = null
    let transcript_status = "none"
    if (pendingBlob) {
      if (!pendingUrl || !pendingPath) {
        const uploaded = await uploadEventAudio(pendingBlob)
        pendingPath = uploaded.path
        pendingUrl = uploaded.url
      }
      audio_url = pendingUrl
      try {
        transcript =
          event.audio_transcript ?? (await transcribeAudio(pendingPath))
        transcript_status = transcript ? "done" : "error"
      } catch {
        transcript_status = "error"
      }
    } else if ("audio_url" in event) {
      audio_url = event.audio_url ?? null
    }
    const photos = await savedImageUrls(event)
    const deadlineIso =
      event.application_deadline.length === DATETIME_LOCAL_LENGTH
        ? new Date(event.application_deadline).toISOString()
        : event.application_deadline
    const payload = {
      category: event.category,
      title: event.title,
      location: event.location,
      country: event.country,
      region: event.region,
      event_date: event.event_date,
      application_deadline: deadlineIso,
      max_applicants: Number(event.max_applicants) || DEFAULT_MAX_APPLICANTS,
      audio_url,
      image_urls: photos.image_urls,
      ...(pendingBlob ? { transcript, transcript_status } : {}),
      details: event.details,
    }
    try {
      return await writeEvent(event, payload, audio_url)
    } catch (err) {
      await forgetImages(photos.uploadedPaths)
      throw err
    }
  },
  success(entity, _, api) {
    entity.status = "ready"
    clearPendingAudio()
    clearEventImages(entity)
    entity.audio_preview_url = null
    api.notify("#eventList:eventsLoad")
    // Saving has to leave the page, because the route is what unmounts it now,
    // and leaving is also what tidies the entity up: the route change runs
    // close(). An edit goes back to the event it came from. A new one goes to
    // the list, because the insert hands back no id to navigate to.
    api.notify(
      "#router:navigate",
      entity.editing_event_id
        ? paths.event(entity.editing_event_id)
        : paths.events,
    )
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? t("errors.saveEvent")
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
      title: row.title ?? "",
      location: row.location ?? "",
      country,
      region,
      event_date: row.event_date ?? "",
      application_deadline: toLocalInput(row.application_deadline),
      max_applicants: row.max_applicants ?? DEFAULT_MAX_APPLICANTS,
      details: row.details ?? {},
    }
    entity.errors = {}
    entity.isValid = true
    entity.audio_url = row.audio_url ?? null
    const photos = [...(row.image_urls ?? [])]
    entity.cover_url = photos[FIRST_INDEX] ?? null
    entity.gallery_urls = photos.slice(SINGULAR)
    entity.pending_cover = null
    entity.pending_gallery = []
    entity.image_error = null
    entity.audio_preview_url = null
    entity.is_recording = false
    entity.is_audio_open = false
    entity.audio_transcript = row.transcript ?? null
    entity.audio_error = null
    api.notify("#country-create:sync", country)
    api.notify("#region-create:sync", region)
    api.notify("#style-create:sync", row.details?.style ?? "")
    api.notify("#genre-create:sync", row.details?.genre ?? "")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? t("errors.loadEvent")
  },
})
