import {
  DEFAULT_JOB_SETTING,
  DEFAULT_MAX_APPLICANTS,
  DEFAULT_SEEKING,
  DESCRIPTION_MAX_LENGTH,
  MIN_TEXT_LENGTH,
  PERCENT_MAX,
} from "../constants/index.js"
import { CURRENCIES, DEFAULT_CURRENCY } from "../data/currencies.js"
import {
  jobTypeById,
  jobTypeId,
  musicGenres,
  weddingMoments,
  weddingStyles,
} from "../data/job-taxonomy.js"
import { canonicalRegion } from "../data/regions/resolve.js"

const MIN_PLACES = 1
const NO_AMOUNT = 0

export const SEEKING = ["substitute", "assistant"]
const FEE_KINDS = ["none", "fixed", "percent", "to_agree"]

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/

const DETAIL_VALIDATORS = {
  wedding: validateWeddingDetails,
  festival: validateShowDetails,
  concert: validateShowDetails,
  apartment: validatePropertyDetails,
  house: validatePropertyDetails,
  office: validatePropertyDetails,
}

// Kept apart from validation on purpose: validation says what is allowed, this
// says what gets written. Nothing returned may alias the payload, which may be
// a revoked draft by the time it is awaited.
/** @param {Record<string, any>} [payload] */
export function normalizeJob(payload = {}) {
  return {
    setting: payload.setting ?? DEFAULT_JOB_SETTING,
    profession: payload.profession,
    seeking: payload.seeking ?? DEFAULT_SEEKING,
    title: payload.title?.trim(),
    location: payload.location?.trim(),
    country: payload.country?.trim(),
    region: canonicalRegion(payload.region),
    job_date: payload.job_date,
    application_deadline: payload.application_deadline,
    max_applicants: payload.max_applicants ?? DEFAULT_MAX_APPLICANTS,
    details: { ...(payload.details ?? {}) },
    description: payload.description?.trim() || null,
    ...("image_urls" in payload && {
      image_urls: [...(payload.image_urls ?? [])],
    }),
  }
}

/**
 * What gets written to job_pay. Only a substitute gives the poster a fee.
 * @param {Record<string, any>} [pay]
 * @param {string} [seeking]
 */
export function normalizePay(pay = {}, seeking = DEFAULT_SEEKING) {
  return {
    ...normalizeAmounts(pay),
    ...(seeking === "substitute" ? normalizeFee(pay) : NO_FEE),
  }
}

const NO_FEE = { fee_kind: "none", fee_amount: null }

function normalizeFee(pay) {
  if (pay.fee_kind === "fixed" || pay.fee_kind === "percent") {
    return { fee_kind: pay.fee_kind, fee_amount: pay.fee_amount }
  }
  if (pay.fee_kind === "to_agree")
    return { fee_kind: "to_agree", fee_amount: null }
  return NO_FEE
}

function normalizeAmounts(pay) {
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
  if (pay.kind === "unpaid") {
    return { kind: "unpaid", amount_min: null, amount_max: null, currency }
  }
  return { kind: "to_agree", amount_min: null, amount_max: null, currency }
}

export function validateJob(values = {}) {
  const errors = {}
  const setting = values.setting ?? DEFAULT_JOB_SETTING
  const details = values.details ?? {}

  fail(
    errors,
    "setting",
    DETAIL_VALIDATORS[setting] ? undefined : "validation.pickSetting",
  )
  const seeking = values.seeking ?? DEFAULT_SEEKING
  fail(
    errors,
    "seeking",
    SEEKING.includes(seeking) ? undefined : "validation.pickSeeking",
  )
  if (
    DETAIL_VALIDATORS[setting] &&
    !jobTypeById(jobTypeId(setting, values.profession))
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
    "description",
    (values.description ?? "").trim().length > DESCRIPTION_MAX_LENGTH
      ? "validation.descriptionTooLong"
      : undefined,
  )
  fail(
    errors,
    "job_date",
    ISO_DATE.test(values.job_date ?? "") ? undefined : "validation.pickDate",
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
  if (seeking === "substitute") validateFee(errors, values.pay)

  const validateDetails = DETAIL_VALIDATORS[setting]
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

function allOf(options, values) {
  return Array.isArray(values) && values.every((value) => oneOf(options, value))
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
  if (details.styles !== undefined && !allOf(weddingStyles, details.styles)) {
    fail(errors, "styles", "validation.pickStyle")
  }
  if (
    details.moments !== undefined &&
    !allOf(weddingMoments, details.moments)
  ) {
    fail(errors, "moments", "validation.pickMoment")
  }
  if (details.genres !== undefined && !allOf(musicGenres, details.genres)) {
    fail(errors, "genres", "validation.pickGenre")
  }
  return errors
}

function validateShowDetails(details) {
  const errors = {}
  fail(
    errors,
    "headliner",
    requiredText(details.headliner, "validation.addHeadliner"),
  )
  if (details.genres !== undefined && !allOf(musicGenres, details.genres)) {
    fail(errors, "genres", "validation.pickGenre")
  }
  return errors
}

function validatePay(errors, pay) {
  if (!pay || pay.kind === "to_agree" || pay.kind === "unpaid") return
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

function validateFee(errors, pay) {
  const kind = pay?.fee_kind ?? "none"
  if (!FEE_KINDS.includes(kind)) {
    fail(errors, "fee_kind", "validation.pickFee")
    return
  }
  if (kind === "fixed" && !isAmount(pay.fee_amount)) {
    fail(errors, "fee_amount", "validation.feeAmount")
  }
  if (
    kind === "percent" &&
    !(isAmount(pay.fee_amount) && pay.fee_amount <= PERCENT_MAX)
  ) {
    fail(errors, "fee_amount", "validation.feePercent")
  }
}

function isAmount(value) {
  return Number.isFinite(value) && value > NO_AMOUNT
}

function validatePropertyDetails() {
  return {}
}
