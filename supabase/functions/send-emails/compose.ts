import { type FeedItem, messageFor } from "../_shared/notification-message.ts"
import wording from "./wording.json" with { type: "json" }

// Apart from index.ts, which reads the environment and the database, so that
// tests can run this.

const DIGEST_HOUR_UTC = 7
const DAY_MS = 86_400_000
const EXPIRY_DAYS = 3
const MAX_LINES = 20
const ONE = 1

type Locale = keyof typeof wording

const FALLBACK_LOCALE: Locale = "en"

export interface Pending extends FeedItem {
  id: string
  user_id: string
  created_at: string
  is_read: boolean
  is_active: boolean
  muted_email_types: string[]
  locale: string | null
}

export interface Recipient {
  email: string
  token: string
}

/** The latest morning digest, which only takes the new jobs posted before it. */
export function latestDigestAt(now: Date) {
  const today = new Date(now)
  today.setUTCHours(DIGEST_HOUR_UTC, 0, 0, 0)
  return today <= now ? today : new Date(today.getTime() - DAY_MS)
}

/** Already seen, turned off or too old: nobody needs an email about it now. */
export function isDropped(row: Pending, now: Date) {
  const age = now.getTime() - new Date(row.created_at).getTime()
  return (
    row.is_read ||
    !row.is_active ||
    row.muted_email_types.includes("all") ||
    row.muted_email_types.includes(row.type) ||
    age > EXPIRY_DAYS * DAY_MS
  )
}

export function isDue(row: Pending, now: Date) {
  return (
    row.type !== "new_job" || new Date(row.created_at) <= latestDigestAt(now)
  )
}

/** One list per person, whoever has something besides new jobs going first. */
export function byRecipient(rows: Pending[]) {
  const groups = new Map<string, Pending[]>()
  for (const row of rows) {
    groups.set(row.user_id, [...(groups.get(row.user_id) ?? []), row])
  }
  const isDigest = (group: Pending[]) =>
    group.every((row) => row.type === "new_job")
  return [...groups.values()].sort(
    (a, b) => Number(isDigest(a)) - Number(isDigest(b)),
  )
}

export function compose(
  rows: Pending[],
  { email, token }: Recipient,
  { appUrl, supabaseUrl }: { appUrl: string; supabaseUrl: string },
) {
  const locale = isLocale(rows[0].locale) ? rows[0].locale : FALLBACK_LOCALE
  const lines = wording[locale]
  const messages = rows.map((row) => messageFor(row, locale))
  const types = new Set(rows.map((row) => row.type))
  const [onlyType] = types
  const stopType = types.size === ONE ? onlyType : "all"
  const stopLink = `${appUrl}/unsubscribe?token=${token}&type=${stopType}&lang=${locale}`
  const shown = messages.slice(0, MAX_LINES)
  const hidden = messages.length - shown.length

  return {
    to: email,
    subject:
      messages.length === ONE
        ? messages[0].body
        : fill(lines.subject, { count: String(messages.length) }),
    text: [
      ...shown.map(
        ({ body, url }) => `${body}\n${lines.open}: ${appUrl}${url}`,
      ),
      ...(hidden ? [fill(lines.more, { count: String(hidden) })] : []),
      "--",
      [
        fill(lines.manage, { link: `${appUrl}/preferences` }),
        fill(stopType === "all" ? lines.stopAll : lines.stopThese, {
          link: stopLink,
        }),
      ].join("\n"),
    ].join("\n\n"),
    // What makes mail apps offer their own unsubscribe button (RFC 8058).
    headers: {
      "List-Unsubscribe": `<${supabaseUrl}/functions/v1/email-unsubscribe?token=${token}&type=${stopType}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  }
}

function isLocale(locale: string | null): locale is Locale {
  return locale !== null && locale in wording
}

function fill(line: string, values: Record<string, string>) {
  return line.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "")
}
