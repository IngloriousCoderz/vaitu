import { handleAsync } from "@inglorious/store/async"

import {
  createEvent,
  fetchEventForEdit,
  updateEvent,
  uploadEventAudio,
} from "../../api/events.js"
import {
  DATETIME_LOCAL_LENGTH,
  DEFAULT_MAX_APPLICANTS,
  FIRST_INDEX,
  ZERO,
} from "../../constants.js"

// Module-scope recorder state (never in the entity: not serializable).
let mediaRecorder = null
let mediaStream = null
let audioChunks = []
let pendingBlob = null
let previewUrl = null

function releaseRecorder() {
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

function clearPendingAudio() {
  pendingBlob = null
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
}

export function open(entity, { event_id } = {}, api) {
  entity.isOpen = true
  entity.status = "idle"
  entity.error = null
  entity.editing_event_id = event_id ?? null
  entity.category = "wedding"
  entity.title = ""
  entity.location = ""
  entity.country = ""
  entity.region = ""
  entity.event_date = ""
  entity.application_deadline = ""
  entity.max_applicants = 5
  entity.details = {}
  entity.audio_url = null
  entity.audio_preview_url = null
  entity.is_recording = false
  entity.is_audio_open = false
  entity.audio_error = null
  releaseRecorder()
  clearPendingAudio()
  api.notify("#country-create:sync", "")
  if (event_id) api.notify(`#${entity.id}:editLoad`, event_id)
}

export function close(entity) {
  entity.isOpen = false
  entity.status = "idle"
  entity.error = null
  entity.is_audio_open = false
  releaseRecorder()
  clearPendingAudio()
}

export function overlaysClose(entity) {
  close(entity)
}

export function fieldSet(entity, { field, value }) {
  entity[field] = value
  entity.error = null
}

export function detailFieldSet(entity, { field, value }) {
  entity.details = { ...entity.details, [field]: value }
  entity.error = null
}

export function categorySelect(entity, category) {
  entity.category = category
  entity.details = {}
  entity.error = null
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
    return true
  },
  success(entity) {
    entity.is_recording = true
  },
  error(entity, err) {
    releaseRecorder()
    entity.is_recording = false
    entity.audio_error = err?.message ?? "Microphone unavailable"
  },
})

export function audioRecordStop(entity, _, api) {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return
  const id = entity.id
  entity.is_recording = false
  mediaRecorder.onstop = () => {
    const type = mediaRecorder.mimeType || "audio/webm"
    pendingBlob = new Blob(audioChunks, { type })
    audioChunks = []
    if (mediaStream) {
      for (const track of mediaStream.getTracks()) track.stop()
      mediaStream = null
    }
    mediaRecorder = null
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = URL.createObjectURL(pendingBlob)
    api.notify(`#${id}:audioClipReady`, { url: previewUrl })
  }
  mediaRecorder.stop()
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

export function audioClipReady(entity, { url }) {
  entity.audio_preview_url = url
  entity.audio_error = null
}

export function audioRemove(entity) {
  releaseRecorder()
  clearPendingAudio()
  entity.is_recording = false
  entity.is_audio_open = false
  entity.audio_preview_url = null
  entity.audio_url = null
  entity.audio_error = null
}

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run(event) {
    let audio_url
    let transcript_status = "none"
    if (pendingBlob) {
      audio_url = await uploadEventAudio(pendingBlob)
      transcript_status = "pending"
    } else if ("audio_url" in event) {
      audio_url = event.audio_url ?? null
    }
    const payload = {
      category: event.category,
      title: event.title,
      location: event.location,
      country: event.country,
      region: event.region,
      event_date: event.event_date,
      application_deadline:
        event.application_deadline.length === DATETIME_LOCAL_LENGTH
          ? new Date(event.application_deadline).toISOString()
          : event.application_deadline,
      max_applicants: Number(event.max_applicants) || DEFAULT_MAX_APPLICANTS,
      audio_url,
      transcript_status,
      details: event.details,
    }
    if (event.editing_event_id) {
      return updateEvent(event.editing_event_id, payload)
    }
    return createEvent(payload)
  },
  success(entity, _, api) {
    entity.status = "ready"
    clearPendingAudio()
    entity.audio_preview_url = null
    api.notify(`#${entity.id}:close`)
    api.notify("#my_events:eventsLoad")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to save event"
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
    entity.category = row.category
    entity.title = row.title
    entity.location = row.location
    entity.country = row.country
    entity.region = row.region
    entity.event_date = row.event_date
    entity.application_deadline = row.application_deadline.slice(
      FIRST_INDEX,
      DATETIME_LOCAL_LENGTH,
    )
    entity.max_applicants = row.max_applicants
    entity.details = row.details
    entity.audio_url = row.audio_url ?? null
    entity.audio_preview_url = null
    entity.is_recording = false
    entity.is_audio_open = false
    entity.audio_error = null
    api.notify("#country-create:sync", row.country ?? "")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load event"
  },
})
