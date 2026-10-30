import {
  DEFAULT_EVENT_CATEGORY,
  DEFAULT_MAX_APPLICANTS,
  MIN_TEXT_LENGTH,
} from "../constants/index.js"
import { festivalGenres, weddingStyles } from "../data/event-taxonomy.js"

const MIN_PLACES = 1

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/
const TRANSCRIPT_STATUSES = ["none", "pending", "done", "error"]

const DETAIL_VALIDATORS = {
  wedding: validateWeddingDetails,
  festival: validateFestivalDetails,
}

// Kept apart from validation on purpose: validation says what is allowed, this
// says what gets written. Nullable fields only when mentioned: `audio_url:
// null` clears an upload, an absent one leaves it. Nothing returned may alias
// the payload, which may be a revoked draft by the time it is awaited.
export function normalizeEvent(payload = {}) {
  return {
    category: payload.category ?? DEFAULT_EVENT_CATEGORY,
    title: payload.title?.trim(),
    location: payload.location?.trim(),
    country: payload.country?.trim(),
    region: payload.region?.trim(),
    event_date: payload.event_date,
    application_deadline: payload.application_deadline,
    max_applicants: payload.max_applicants ?? DEFAULT_MAX_APPLICANTS,
    details: { ...(payload.details ?? {}) },
    ...("audio_url" in payload && { audio_url: payload.audio_url }),
    ...("transcript" in payload && { transcript: payload.transcript }),
    // Not defaulted here: a default would also land on updates and reset a
    // finished transcript.
    ...("transcript_status" in payload && {
      transcript_status: payload.transcript_status,
    }),
    ...("image_urls" in payload && {
      image_urls: [...(payload.image_urls ?? [])],
    }),
  }
}

export function validateEvent(values = {}) {
  const errors = {}
  const category = values.category ?? DEFAULT_EVENT_CATEGORY
  const details = values.details ?? {}

  fail(
    errors,
    "category",
    DETAIL_VALIDATORS[category] ? undefined : "validation.pickCategory",
  )
  fail(errors, "title", requiredText(values.title, "validation.addTitle"))
  fail(
    errors,
    "location",
    requiredText(values.location, "validation.addLocation"),
  )
  fail(errors, "country", requiredText(values.country, "validation.addCountry"))
  fail(errors, "region", requiredText(values.region, "validation.addRegion"))
  fail(
    errors,
    "event_date",
    ISO_DATE.test(values.event_date ?? "") ? undefined : "validation.pickDate",
  )
  fail(
    errors,
    "application_deadline",
    INSTANT.test(values.application_deadline ?? "")
      ? undefined
      : "validation.pickDeadline",
  )
  if (
    values.max_applicants !== undefined &&
    !(
      Number.isInteger(values.max_applicants) &&
      values.max_applicants >= MIN_PLACES
    )
  ) {
    fail(errors, "max_applicants", "validation.pickPlaces")
  }
  if (values.audio_url && !isWebUrl(values.audio_url)) {
    fail(errors, "audio_url", "validation.checkAudioLink")
  }
  if (
    values.transcript_status !== undefined &&
    !TRANSCRIPT_STATUSES.includes(values.transcript_status)
  ) {
    fail(errors, "transcript_status", "validation.unknownTranscript")
  }

  const validateDetails = DETAIL_VALIDATORS[category]
  if (validateDetails) {
    const detailErrors = validateDetails(
      typeof details === "object" && details !== null ? details : {},
    )
    if (Object.keys(detailErrors).length) errors.details = detailErrors
  }
  return errors
}

export function firstError(errors = {}) {
  for (const error of Object.values(errors)) {
    if (error && typeof error === "object") {
      const nested = firstError(error)
      if (nested) return nested
    } else if (error) {
      return error
    }
  }
  return undefined
}

function trimmed(value) {
  return typeof value === "string" ? value.trim() : ""
}

function oneOf(options, value) {
  return options.some((option) => option.value === value)
}

function fail(errors, field, message) {
  if (message) errors[field] = message
}

function requiredText(value, message) {
  return trimmed(value).length >= MIN_TEXT_LENGTH ? undefined : message
}

function validateWeddingDetails(details) {
  const errors = {}
  fail(
    errors,
    "spouse_first_name_1",
    requiredText(details.spouse_first_name_1, "validation.addName"),
  )
  fail(
    errors,
    "spouse_first_name_2",
    requiredText(details.spouse_first_name_2, "validation.addName"),
  )
  if (details.style && !oneOf(weddingStyles, details.style)) {
    fail(errors, "style", "validation.pickStyle")
  }
  return errors
}

function validateFestivalDetails(details) {
  const errors = {}
  fail(
    errors,
    "headliner",
    requiredText(details.headliner, "validation.addHeadliner"),
  )
  if (details.genre && !oneOf(festivalGenres, details.genre)) {
    fail(errors, "genre", "validation.pickGenre")
  }
  return errors
}

function isWebUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
