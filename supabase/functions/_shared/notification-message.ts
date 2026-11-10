import wording from "./notification-wording.json" with { type: "json" }

// Copies of the feed's lines (notification-wording.json) and destinations (pathFor): a
// function cannot import app source. src/common/notifications/push.test.js
// fails when they drift.

export interface FeedItem {
  type: string
  job_id: string | null
  application_id: string | null
  job_title: string | null
  job_status: string | null
  applicant_name: string | null
  poster_name: string | null
}

export interface PushMessage {
  title: string
  body: string
  url: string
}

type Locale = keyof typeof wording

const FALLBACK_LOCALE: Locale = "en"
const APPLICANT_ACTIONS = new Set([
  "application_received",
  "application_withdrawn",
  "agreement_confirmed",
  "agreement_rejected",
])

export function messageFor(item: FeedItem, locale: string | null): PushMessage {
  return {
    title: "Vaitu",
    body: line(item, isLocale(locale) ? locale : FALLBACK_LOCALE),
    url: destination(item),
  }
}

function isLocale(locale: string | null): locale is Locale {
  return locale !== null && locale in wording
}

function line(item: FeedItem, locale: Locale) {
  const lines = wording[locale]
  const key = camelCase(item.type)
  const text =
    key in lines ? lines[key as keyof typeof lines] : lines.jobUpdated
  return fill(text, {
    name: actorName(item) ?? lines.someone,
    title: item.job_title ?? "",
  })
}

/** Who did what the notification is about: an applicant, or the poster. */
export function actorName(item: FeedItem) {
  return APPLICANT_ACTIONS.has(item.type)
    ? item.applicant_name
    : item.poster_name
}

function camelCase(type: string) {
  return type.replace(/_(\w)/g, (_, letter) => letter.toUpperCase())
}

function fill(line: string, values: Record<string, string>) {
  return line.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "")
}

function destination(item: FeedItem) {
  if (
    item.type === "application_received" ||
    item.type === "application_withdrawn"
  ) {
    if (!item.job_id) return "/jobs"
    return item.job_status === "open"
      ? `/jobs/${item.job_id}/applications`
      : `/jobs/${item.job_id}`
  }
  if (item.type === "job_cancelled") return "/applications"
  if (item.type === "settlement_contested") {
    if (item.application_id) return `/applications/${item.application_id}`
    return item.job_id ? `/jobs/${item.job_id}/applications` : "/jobs"
  }
  if (
    item.type === "job_outcome_due" ||
    item.type === "agreement_confirmed" ||
    item.type === "agreement_rejected"
  ) {
    return item.job_id ? `/jobs/${item.job_id}/applications` : "/jobs"
  }
  if (
    item.type === "application_selected" ||
    item.type === "application_rejected" ||
    item.type === "job_reviewed" ||
    item.type === "agreement_proposed" ||
    item.type === "settlement_due"
  ) {
    return item.application_id
      ? `/applications/${item.application_id}`
      : "/applications"
  }
  return item.job_id ? `/jobs/${item.job_id}` : "/jobs"
}
