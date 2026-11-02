import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"

import { alertProviderLimit } from "../_shared/alerts.ts"
import { EmailError, sendEmails } from "../_shared/email.ts"
import { json, serve, STATUS_CODE } from "../_shared/http.ts"
import { admin, callerRole, env } from "../_shared/supabase.ts"
import {
  byRecipient,
  compose,
  isDropped,
  isDue,
  type Pending,
  type Recipient,
} from "./compose.ts"

// Short of Resend's free 100 a day: signup confirmations and account emails
// share that allowance.
const DAILY_BUDGET = 80
const PAGE = 1000
const STATUS_TOO_MANY_REQUESTS = 429

const COLUMNS =
  "id, user_id, type, created_at, is_read, event_id, application_id, applicant_name, event_title, events(title, status), applications(applicant:profiles!applications_applicant_id_fkey(full_name)), recipient:profiles!notifications_user_id_fkey(locale, is_active, muted_email_types)"

serve(async (req) => {
  if (callerRole(req) !== "service_role") {
    return json({ error: "Database only" }, STATUS_CODE.Forbidden)
  }

  const db = admin()
  const now = new Date()

  const { data, error } = await db
    .from("notifications")
    .select(COLUMNS)
    .is("emailed_at", null)
    .order("created_at")
    .limit(PAGE)
  if (error) throw error

  const rows = data.map(toPending)
  const dropped = rows.filter((row) => isDropped(row, now))
  await mark(db, dropped, now.toISOString())

  const due = rows.filter((row) => !isDropped(row, now) && isDue(row, now))
  const groups = byRecipient(due)
  const allowed = groups.slice(0, await budgetLeft(db))
  if (allowed.length < groups.length) {
    await alertProviderLimit("resend", STATUS_TOO_MANY_REQUESTS)
  }
  if (!allowed.length) return json({ sent: 0, dropped: dropped.length })

  const recipients = await recipientsOf(db, allowed)
  const toSend = allowed.filter((group) => recipients.has(group[0].user_id))

  // Claimed first, so a run that overlaps this one can't send them twice.
  const claimed = toSend.flat()
  await mark(db, claimed, now.toISOString())
  try {
    await sendEmails(
      toSend.map((group) =>
        compose(group, recipients.get(group[0].user_id) as Recipient, {
          appUrl: env("APP_URL"),
          supabaseUrl: env("SUPABASE_URL"),
        }),
      ),
    )
  } catch (err) {
    await mark(db, claimed, null)
    if (err instanceof EmailError) {
      await alertProviderLimit("resend", err.status)
    }
    throw err
  }

  const { error: countError } = await db.rpc("count_emails_sent", {
    p_count: toSend.length,
  })
  if (countError) console.error("email count failed", countError)

  return json({ sent: toSend.length, dropped: dropped.length })
}, "send failed")

async function budgetLeft(db: ReturnType<typeof admin>) {
  const { data, error } = await db
    .from("email_budget")
    .select("sent")
    .eq("day", new Date().toISOString().slice(0, 10))
    .maybeSingle()
  if (error) throw error
  return Math.max(DAILY_BUDGET - (data?.sent ?? 0), 0)
}

async function recipientsOf(db: ReturnType<typeof admin>, groups: Pending[][]) {
  const { data, error } = await db.rpc("email_recipients", {
    p_user_ids: groups.map((group) => group[0].user_id),
  })
  if (error) throw error
  return new Map<string, Recipient>(
    data
      .filter((row: { email: string | null }) => row.email)
      .map((row: Recipient & { user_id: string }) => [row.user_id, row]),
  )
}

async function mark(
  db: ReturnType<typeof admin>,
  rows: Pending[],
  emailed_at: string | null,
) {
  if (!rows.length) return
  const { error } = await db
    .from("notifications")
    .update({ emailed_at })
    .in(
      "id",
      rows.map((row) => row.id),
    )
  if (error) throw error
}

// deno-lint-ignore no-explicit-any
function toPending(row: any): Pending {
  const event = one(row.events)
  const recipient = one(row.recipient)
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    created_at: row.created_at,
    is_read: row.is_read,
    event_id: row.event_id,
    application_id: row.application_id,
    event_title: event?.title ?? row.event_title ?? null,
    event_status: event?.status ?? null,
    applicant_name:
      one(one(row.applications)?.applicant)?.full_name ??
      row.applicant_name ??
      null,
    is_active: recipient?.is_active ?? false,
    muted_email_types: recipient?.muted_email_types ?? [],
    locale: recipient?.locale ?? null,
  }
}

// Every join here is to one row, which the untyped client cannot know: it
// types each embed as a list.
function one<T>(embed: T | T[] | null | undefined) {
  return (Array.isArray(embed) ? embed[0] : embed) ?? null
}
