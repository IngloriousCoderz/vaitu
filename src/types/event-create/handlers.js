import { handleAsync } from "@inglorious/store/async"
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
  APPLICATION_DEADLINE_LEAD_DAYS,
  AUDIO_MAX_SECONDS,
  DATE_ISO_LENGTH,
  DATETIME_LOCAL_LENGTH,
  DEADLINE_END_OF_DAY,
  DEFAULT_MAX_APPLICANTS,
  FIRST_INDEX,
  MIN_AUDIO_BYTES,
  MONTH_INDEX_OFFSET,
  PAD_LENGTH,
  SINGULAR,
  ZERO,
} from "../../constants.js"
import { stopTick } from "../../ticker.js"
import { weddingStyles } from "../../validation/events.js"

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

function releaseRecorder() {
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

function clearPendingAudio() {
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
  entity.is_transcribing = false
  entity.is_parsing = false
  entity.audio_elapsed = ZERO
  entity.audio_transcript = null
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
  if (
    entity.application_deadline ||
    !/^\d{4}-\d{2}-\d{2}$/.test(entity.event_date ?? "")
  ) {
    return
  }
  const candidate = `${shiftDate(entity.event_date, APPLICATION_DEADLINE_LEAD_DAYS)}T${DEADLINE_END_OF_DAY}`
  if (new Date(candidate).getTime() > Date.now()) {
    entity.application_deadline = candidate
  }
}

export function eventDateSet(entity, { value }) {
  entity.event_date = value
  entity.error = null
  autofillDeadline(entity)
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
    entity.audio_error = err?.message ?? "Microphone unavailable"
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
  entity.audio_error = "Recording came out empty — try again"
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
    if (!pendingBlob) throw new Error("No audio to process")
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
    entity.audio_error =
      err?.message ?? "Transcription failed — will retry on save"
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
    const details = { ...entity.details }
    for (const field of FILLABLE_DETAILS) {
      const value = fields[field]
      if (typeof value !== "string" || !value.trim()) continue
      if (field === "style" && !weddingStyles.some((s) => s.value === value)) {
        continue
      }
      details[field] = value.trim()
    }
    entity.details = details
    if (typeof fields.location === "string" && fields.location.trim()) {
      entity.location = fields.location.trim()
    }
    if (typeof fields.country === "string" && fields.country.trim()) {
      entity.country = fields.country.trim()
      api.notify("#country-create:sync", entity.country)
    }
    if (typeof fields.region === "string" && fields.region.trim()) {
      entity.region = fields.region.trim()
    }
    if (
      typeof fields.event_date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(fields.event_date)
    ) {
      entity.event_date = fields.event_date
      autofillDeadline(entity)
    }
  },
  error(entity) {
    entity.is_parsing = false
  },
})
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
      ...(pendingBlob ? { transcript, transcript_status } : {}),
      details: event.details,
    }
    if (event.editing_event_id) {
      const previous =
        typeof event.audio_url === "string" ? event.audio_url : null
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
    return createEvent(payload)
  },
  success(entity, _, api) {
    entity.status = "ready"
    clearPendingAudio()
    entity.audio_preview_url = null
    api.notify(`#${entity.id}:close`)
    api.notify("#myEvents:eventsLoad")
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
    entity.application_deadline = toLocalInput(row.application_deadline)
    entity.max_applicants = row.max_applicants
    entity.details = row.details
    entity.audio_url = row.audio_url ?? null
    entity.audio_preview_url = null
    entity.is_recording = false
    entity.is_audio_open = false
    entity.audio_transcript = row.transcript ?? null
    entity.audio_error = null
    api.notify("#country-create:sync", row.country ?? "")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load event"
  },
})
