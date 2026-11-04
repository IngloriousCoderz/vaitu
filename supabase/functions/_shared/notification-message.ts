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
}

export interface PushMessage {
  title: string
  body: string
  url: string
}

type Locale = keyof typeof wording

const FALLBACK_LOCALE: Locale = "en"

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
  const title = item.job_title ?? ""
  switch (item.type) {
    case "application_received":
      return fill(lines.applicationReceived, {
        name: item.applicant_name ?? "",
        title,
      })
    case "application_selected":
      return fill(lines.applicationSelected, { title })
    case "application_rejected":
      return fill(lines.applicationRejected, { title })
    case "application_withdrawn":
      return fill(lines.applicationWithdrawn, {
        name: item.applicant_name ?? "",
        title,
      })
    case "job_closed":
      return fill(lines.jobClosed, { title })
    case "new_job":
      return fill(lines.newJob, { title })
    case "job_outcome_due":
      return fill(lines.jobOutcomeDue, { title })
    case "job_reviewed":
      return fill(lines.jobReviewed, { title })
    case "job_cancelled":
      return fill(lines.jobCancelled, { title })
    case "agreement_proposed":
      return fill(lines.agreementProposed, { title })
    case "agreement_confirmed":
      return fill(lines.agreementConfirmed, { title })
    case "agreement_rejected":
      return fill(lines.agreementRejected, { title })
    case "settlement_due":
      return fill(lines.settlementDue, { title })
    case "settlement_contested":
      return fill(lines.settlementContested, { title })
    default:
      return fill(lines.jobUpdated, { title })
  }
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
