import wording from "./wording.json" with { type: "json" }

// What a push says and where a tap on it lands, for a notification in the
// feed's own shape (src/api/notifications.js flattens its rows the same way).
//
// A function cannot import app source, so the lines and the destinations are
// copies: wording.json of each catalogue's notifications.types, and
// destination() of the feed's pathFor. src/common/notifications/push.test.js
// holds both to the originals, so a change on one side fails until the other
// follows.

export interface FeedItem {
  type: string
  event_id: string | null
  application_id: string | null
  event_title: string | null
  event_status: string | null
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
  const title = item.event_title ?? ""
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
    case "event_closed":
      return fill(lines.eventClosed, { title })
    default:
      return fill(lines.eventUpdated, { title })
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
    if (!item.event_id) return "/events"
    return item.event_status === "open"
      ? `/events/${item.event_id}/applications`
      : `/events/${item.event_id}`
  }
  if (
    item.type === "application_selected" ||
    item.type === "application_rejected"
  ) {
    return item.application_id
      ? `/applications/${item.application_id}`
      : "/applications"
  }
  return item.event_id ? `/events/${item.event_id}` : "/events"
}
