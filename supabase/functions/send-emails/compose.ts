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
const RTL_LOCALES = new Set<string>(["ar"])
const TIME_ZONE = "Europe/Rome"
const COLORS = {
  page: "#f6f3ea",
  card: "#fffdf7",
  ink: "#22301f",
  muted: "#5f6656",
  line: "#e3dcc9",
  warm: "#b4532a",
}
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const LOGO_WIDTH = 129
const LOGO_HEIGHT = 36
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export interface Pending extends FeedItem {
  id: string
  user_id: string
  created_at: string
  is_read: boolean
  is_active: boolean
  muted_email_types: string[]
  locale: string | null
}

interface Link {
  label: string
  url: string
}

interface Update extends Link {
  at: string
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
  const at = new Intl.DateTimeFormat(locale, {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
  const shown: Update[] = messages
    .slice(0, MAX_LINES)
    .map(({ body, url }, i) => ({
      label: body,
      url: `${appUrl}${url}`,
      at: at.format(new Date(rows[i].created_at)),
    }))
  const hidden = messages.length - shown.length
  const more = hidden ? fill(lines.more, { count: String(hidden) }) : ""
  const footer = [
    { label: lines.manage, url: `${appUrl}/preferences` },
    {
      label: stopType === "all" ? lines.stopAll : lines.stopThese,
      url: stopLink,
    },
  ]

  return {
    to: email,
    subject:
      messages.length === ONE
        ? messages[0].body
        : fill(lines.subject, { count: String(messages.length) }),
    text: [
      lines.intro,
      ...shown.map(({ label, url, at }) => `${at}\n${label}\n${url}`),
      ...(more ? [more] : []),
      "--",
      footer.map(({ label, url }) => `${label}\n${url}`).join("\n\n"),
    ].join("\n\n"),
    html: renderHtml({
      locale,
      logo: `${appUrl}/email-logo.png`,
      intro: lines.intro,
      open: lines.open,
      shown,
      more,
      footer,
    }),
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

function renderHtml({
  locale,
  logo,
  intro,
  open,
  shown,
  more,
  footer,
}: {
  locale: Locale
  logo: string
  intro: string
  open: string
  shown: Update[]
  more: string
  footer: Link[]
}) {
  const dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr"
  const items = shown.map(
    (
      { label, url, at },
      i,
    ) => `<tr><td style="padding: 16px 0;${i ? ` border-top: 1px solid ${COLORS.line};` : ""}">
<p style="margin: 0 0 4px; font-size: 13px; color: ${COLORS.muted};">${escape(at)}</p>
<p style="margin: 0 0 6px; font-size: 16px; color: ${COLORS.ink};">${escape(label)}</p>
<a href="${escape(url)}" style="font-size: 15px; font-weight: 600; color: ${COLORS.warm}; text-decoration: none;">${escape(open)} ${dir === "rtl" ? "←" : "→"}</a>
</td></tr>`,
  )
  const links = footer.map(
    ({ label, url }) =>
      `<a href="${escape(url)}" style="color: ${COLORS.muted};">${escape(label)}</a>`,
  )
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin: 0; padding: 0; background: ${COLORS.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${COLORS.page}; font-family: ${FONT}; line-height: 1.5;">
<tr><td align="center" style="padding: 32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
<tr><td style="padding: 0 4px 20px;"><img src="${escape(logo)}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="Vaitu" style="display: block; border: 0;"></td></tr>
<tr><td style="background: ${COLORS.card}; border: 1px solid ${COLORS.line}; border-radius: 16px; padding: 24px 28px 8px;">
<p style="margin: 0 0 4px; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; line-height: 1.3; color: ${COLORS.ink};">${escape(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${items.join("\n")}
</table>
${more ? `<p style="margin: 0 0 16px; padding-top: 16px; border-top: 1px solid ${COLORS.line}; color: ${COLORS.muted};">${escape(more)}</p>` : ""}
</td></tr>
<tr><td style="padding: 20px 4px 0; font-size: 13px; color: ${COLORS.muted};">${links.join(" · ")}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function anchor(url: string, label: string) {
  return `<a href="${escape(url)}">${escape(label)}</a>`
}

function escape(text: string) {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
}
