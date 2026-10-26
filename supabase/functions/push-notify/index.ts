import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"

import webpush from "npm:web-push@3.6.7"

import { json, serve, STATUS_CODE } from "../_shared/http.ts"
import { admin, env } from "../_shared/supabase.ts"

/* The assemble-and-swap of push. The database only wakes this function —
   "a notifications row exists" — and this function owns everything else, in
   one claim-select so two things cannot both send for the same row:
     - the claim: pushed_at CAS (null -> now). The wake may run before the
       insert's transaction commits; the UPDATE waits on the row lock and
       re-checks under READ COMMITTED, so the real wake always wins.
       Whichever caller claims first sends; every later one (a replay, a
       retry, a client holding the publishable key) finds nothing to claim
       and goes home — abuse costs an attacker nothing but resends they
       cannot win, and a guessed uuid never matches a row they can read.
     - the read: joins the row to what the copy needs (event title/status,
       applicant name) plus the recipient's profile, whose `locale` picks
       the wording. The line is interpolated here and sent as
       { title, body, url }: the service worker is a dumb shower of
       already-rendered text.
     - the sweep: an endpoint answering 404/410 is gone (uninstalled
       browser, revoked permission) and is dropped.

   The wording lives in this folder, not in the app's locale files: a push
   line is written for the length an OS toast tolerates, the kind of copy
   that belongs beside the only code that formats it (the same reason
   parse-event keeps its prompt here). The feed's in-app line stays in
   src/i18n; when a wording changes, both files change deliberately. The
   destination map mirrors src/routes.js for the same reason: a route both
   files agree on is a route that ships one link and one screen. */

// Same strings the app's feed renders for the same fact; the toast copies
// them today. Keys are camelCase like the app's catalogue keys.
const WORDING: Record<string, Record<string, string>> = {
  ar: {
    applicationReceived: "قدّم {{name}} ترشّحه إلى {{title}}",
    applicationSelected: "لقد اخترتك لـ {{title}}",
    applicationRejected: "لم يتم اختيارك لـ {{title}}",
    eventUpdated: "طرأ تحديثات على {{title}}",
    eventClosed: "أُغلق {{title}}",
  },
  en: {
    applicationReceived: "{{name}} applied to {{title}}",
    applicationSelected: "You were selected for {{title}}",
    applicationRejected: "You were not selected for {{title}}",
    eventUpdated: "{{title}} has updates",
    eventClosed: "{{title}} was closed",
  },
  fr: {
    applicationReceived: "{{name}} a postulé à {{title}}",
    applicationSelected: "Vous avez été retenu pour {{title}}",
    applicationRejected: "Vous n'avez pas été retenu pour {{title}}",
    eventUpdated: "{{title}} a été mis à jour",
    eventClosed: "{{title}} a été clôturé",
  },
  it: {
    applicationReceived: "{{name}} ha fatto candidatura per {{title}}",
    applicationSelected: "Sei stato selezionato per {{title}}",
    applicationRejected: "Non sei stato selezionato per {{title}}",
    eventUpdated: "{{title}} è stato aggiornato",
    eventClosed: "{{title}} è stato chiuso",
  },
  ja: {
    applicationReceived: "{{name}}さんが「{{title}}」に応募しました",
    applicationSelected: "「{{title}}」に選ばれました",
    applicationRejected: "「{{title}}」は選外でした",
    eventUpdated: "「{{title}}」に更新があります",
    eventClosed: "「{{title}}」は締め切られました",
  },
}

// The solid brand line every toast carries.
const TITLE = "Vaitu"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The shape the SELECT guarantees (the client's generated types cannot read
// this column/aliased-embed layout) and the bigger of an upstream web-push
// error that matters here.
interface ClaimedRow {
  user_id: string
  type: string
  event_id: string | null
  application_id: string | null
  events: { title: string; status: string } | null
  applications: { applicant: { full_name: string } | null } | null
  profile: { locale: string | null } | null
}

interface PushError extends Error {
  statusCode?: number
}

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "POST only" }, STATUS_CODE.MethodNotAllowed)
  }

  const body = await req.json().catch(() => null)
  const notificationId =
    typeof body?.notification_id === "string" ? body.notification_id : ""
  if (!UUID.test(notificationId)) {
    return json({ error: "notification_id required" }, STATUS_CODE.BadRequest)
  }

  const db = admin()

  const claimed = await db
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("pushed_at", null)
    .select(
      "user_id, type, event_id, application_id, events(title, status), applications(applicant:profiles!applications_applicant_id_fkey(full_name)), profile:profiles!notifications_user_id_fkey(locale)",
    )
    .maybeSingle()
  if (claimed.error) throw claimed.error
  if (!claimed.data) return json({ sent: 0, claimed: false })

  const row = claimed.data as unknown as ClaimedRow

  const { data: subs, error: subsError } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", row.user_id)
  if (subsError) throw subsError

  webpush.setVapidDetails(
    env("VAPID_SUBJECT"),
    env("VAPID_PUBLIC_KEY"),
    env("VAPID_PRIVATE_KEY"),
  )

  const message = JSON.stringify(pushFor(row))

  let sent = 0
  await Promise.allSettled(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message,
        )
        sent++
      } catch (error) {
        const status = (error as PushError)?.statusCode
        if (status === 404 || status === 410) {
          await db
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint)
        } else {
          // Not gone and not refused: this failure lives only on the stderr
          // here — the endpoint stays and is retried by the next push.
          console.error(
            "push send failed",
            status,
            error instanceof Error ? error.message : error,
          )
        }
      }
    }),
  )

  return json({ sent, claimed: true })
}, "push failed")

// "application_received" -> "applicationReceived": the wording keys are
// camelCase, while the database column speaks snake_case.
function notificationTypeKey(type: string): string {
  return type?.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) ?? type
}

// The interpolation i18next would run for `t()`: `{{param}}` placeholders,
// missing params left visibly empty. Kept minimal because a push line is a
// verb and two names, never plurals or nesting.
function interpolate(
  template: string | undefined,
  params: Record<string, string> = {},
): string {
  return (
    template?.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? "") ?? ""
  )
}

// Where a notification click lands on this item: the phone's own web app
// resolves these the same way the browser's does (src/routes.js, mirrored
// here on purpose — the function must not import app source).
function destination(item: {
  type: string
  event_id: string | null
  application_id: string | null
  event_status: string | null
}): string {
  if (item.type === "application_received") {
    if (item.event_status === "open" && item.event_id) {
      return `/events/${item.event_id}/applications`
    }
    return item.event_id ? `/events/${item.event_id}` : "/events"
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

function pushFor(row: ClaimedRow): {
  title: string
  body: string
  url: string
} {
  const item = {
    type: row.type,
    event_id: row.event_id ?? null,
    application_id: row.application_id ?? null,
    event_title: row.events?.title ?? null,
    event_status: row.events?.status ?? null,
    applicant_name: row.applications?.applicant?.full_name ?? null,
  }
  const types = WORDING[row.profile?.locale ?? "en"] ?? WORDING.en
  // A locale that has not grown the type's line yet falls back to English,
  // which is always complete.
  const template =
    types[notificationTypeKey(row.type)] ??
    WORDING.en[notificationTypeKey(row.type)]
  // application_received names the applicant; the two decisions speak to
  // the recipient, who is the applicant — the title alone.
  const params: Record<string, string> =
    item.type === "application_received"
      ? { name: item.applicant_name ?? "", title: item.event_title ?? "" }
      : { title: item.event_title ?? "" }
  return {
    title: TITLE,
    body: interpolate(template, params),
    url: destination(item),
  }
}
