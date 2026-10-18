import {
  DEFAULT_EVENT_CATEGORY,
  DEFAULT_MAX_APPLICANTS,
  MIN_TEXT_LENGTH,
} from "../constants/index.js"
import { festivalGenres, weddingStyles } from "../data/event-taxonomy.js"
import { t } from "../i18n/index.js"

// Turns a submitted payload into the row the `events` table expects.
//
// Kept apart from validation on purpose. Validation answers "is this allowed";
// this answers "what gets written". The two used to be one schema, which
// quietly welded them together and let a field the form sends (transcript) be
// dropped on the floor because the schema never mentioned it.
//
// Nullable fields are only included when the caller actually mentions them.
// That distinction is load-bearing: `audio_url: null` clears a previous
// upload, while an absent `audio_url` leaves the column untouched.
//
// Nothing returned may alias the payload: a row that still points into a
// caller's object becomes a live liability the moment anything is awaited. The
// copy here is a floor, not the fix — by the time this runs the payload may
// already be unrevivable, so callers detach while their source is still live
// (see saveSubmit). A schema used to do this for free, because parsing rebuilds
// every object it returns.
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
    // Deliberately not defaulted here. A default would land on every update as
    // well as every create, quietly resetting a transcript that already
    // finished. createEvent supplies the starting value for a new row instead.
    ...("transcript_status" in payload && {
      transcript_status: payload.transcript_status,
    }),
  }
}
// ---------------------------------------------------------------------------
// Validation
//
// Answers "is this allowed", in the shape Inglorious Web's Form.validate
// expects: an object of errors with the same shape as the values, empty when
// the values are fine.
//
// A wedding names two people. A festival names the act that draws the crowd.
// Those are different facts about the world, not one fact with a flag, so they
// are written as two functions. Adding a third kind of event means writing a
// third function — not extending a lookup table.
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
// Two shapes, because there are two callers. A datetime-local input yields
// "2026-05-01T12:00" with no seconds and no zone; the API layer receives the
// same value already converted to an ISO instant. Both are valid, and one
// regex covering them is why the form and the API guard cannot disagree.
const INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/
const TRANSCRIPT_STATUSES = ["none", "pending", "done", "error"]

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
    requiredText(details.spouse_first_name_1, t("validation.addName")),
  )
  fail(
    errors,
    "spouse_first_name_2",
    requiredText(details.spouse_first_name_2, t("validation.addName")),
  )
  if (details.style && !oneOf(weddingStyles, details.style)) {
    fail(errors, "style", t("validation.pickStyle"))
  }
  return errors
}

function validateFestivalDetails(details) {
  const errors = {}
  fail(
    errors,
    "headliner",
    requiredText(details.headliner, t("validation.addHeadliner")),
  )
  if (details.genre && !oneOf(festivalGenres, details.genre)) {
    fail(errors, "genre", t("validation.pickGenre"))
  }
  return errors
}

// The categories this app knows how to validate, named after the concepts
// themselves. A category missing from here is rejected outright rather than
// waved through with no rules at all, which is what the old fallback did.
const DETAIL_VALIDATORS = {
  wedding: validateWeddingDetails,
  festival: validateFestivalDetails,
}

export function validateEvent(values = {}) {
  const errors = {}
  const category = values.category ?? DEFAULT_EVENT_CATEGORY
  const details = values.details ?? {}

  fail(
    errors,
    "category",
    DETAIL_VALIDATORS[category] ? undefined : t("validation.pickCategory"),
  )
  fail(errors, "title", requiredText(values.title, t("validation.addTitle")))
  fail(
    errors,
    "location",
    requiredText(values.location, t("validation.addLocation")),
  )
  fail(
    errors,
    "country",
    requiredText(values.country, t("validation.addCountry")),
  )
  fail(errors, "region", requiredText(values.region, t("validation.addRegion")))
  fail(
    errors,
    "event_date",
    ISO_DATE.test(values.event_date ?? "")
      ? undefined
      : t("validation.pickDate"),
  )
  fail(
    errors,
    "application_deadline",
    INSTANT.test(values.application_deadline ?? "")
      ? undefined
      : t("validation.pickDeadline"),
  )
  if (
    values.max_applicants !== undefined &&
    !(Number.isInteger(values.max_applicants) && values.max_applicants > 0)
  ) {
    fail(errors, "max_applicants", t("validation.pickPlaces"))
  }
  if (values.audio_url && !isWebUrl(values.audio_url)) {
    fail(errors, "audio_url", t("validation.checkAudioLink"))
  }
  if (
    values.transcript_status !== undefined &&
    !TRANSCRIPT_STATUSES.includes(values.transcript_status)
  ) {
    fail(errors, "transcript_status", t("validation.unknownTranscript"))
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

function isWebUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

// The API layer still throws a single message, so it needs the first one out
// of a nested errors object. Depth-first, matching the order the fields are
// validated in.
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
