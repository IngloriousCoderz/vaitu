import {
  DEFAULT_EVENT_CATEGORY,
  DEFAULT_MAX_APPLICANTS,
  MIN_TEXT_LENGTH,
} from "../constants/index.js"
import { CURRENCIES, DEFAULT_CURRENCY } from "../data/currencies.js"
import {
  festivalGenres,
  jobTypeById,
  jobTypeId,
  weddingStyles,
} from "../data/event-taxonomy.js"
import { canonicalRegion } from "../data/regions/resolve.js"

const MIN_PLACES = 1
const NO_AMOUNT = 0

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/

const DETAIL_VALIDATORS = {
  wedding: validateWeddingDetails,
  festival: validateFestivalDetails,
  apartment: validatePropertyDetails,
  house: validatePropertyDetails,
  office: validatePropertyDetails,
}

// Kept apart from validation on purpose: validation says what is allowed, this
// says what gets written. Nothing returned may alias the payload, which may be
// a revoked draft by the time it is awaited.
/** @param {Record<string, any>} [payload] */
export function normalizeEvent(payload = {}) {
  return {
    category: payload.category ?? DEFAULT_EVENT_CATEGORY,
    profession: payload.profession,
    title: payload.title?.trim(),
    location: payload.location?.trim(),
    country: payload.country?.trim(),
    region: canonicalRegion(payload.region),
    event_date: payload.event_date,
    application_deadline: payload.application_deadline,
    max_applicants: payload.max_applicants ?? DEFAULT_MAX_APPLICANTS,
    details: { ...(payload.details ?? {}) },
    ...("image_urls" in payload && {
      image_urls: [...(payload.image_urls ?? [])],
    }),
  }
}

export function normalizePay(pay = {}) {
  const currency = pay.currency ?? DEFAULT_CURRENCY
  if (pay.kind === "fixed") {
    return {
      kind: "fixed",
      amount_min: pay.amount_min,
      amount_max: null,
      currency,
    }
  }
  if (pay.kind === "range") {
    return {
      kind: "range",
      amount_min: pay.amount_min,
      amount_max: pay.amount_max,
      currency,
    }
  }
  return { kind: "to_agree", amount_min: null, amount_max: null, currency }
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
  if (
    DETAIL_VALIDATORS[category] &&
    !jobTypeById(jobTypeId(category, values.profession))
  ) {
    fail(errors, "profession", "validation.pickJobType")
  }
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

  validatePay(errors, values.pay)

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

function validatePay(errors, pay) {
  if (!pay || pay.kind === "to_agree") return
  if (!CURRENCIES.includes(pay.currency)) {
    fail(errors, "pay_currency", "validation.payCurrency")
  }
  if (!isAmount(pay.amount_min)) {
    fail(errors, "pay_min", "validation.payAmount")
  }
  if (pay.kind !== "range") return
  if (!isAmount(pay.amount_max) || pay.amount_max <= pay.amount_min) {
    fail(errors, "pay_max", "validation.payRange")
  }
}

function isAmount(value) {
  return Number.isFinite(value) && value >= NO_AMOUNT
}

function validatePropertyDetails() {
  return {}
}
