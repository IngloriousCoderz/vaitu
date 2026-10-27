import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"

import { decodeBase64Url } from "jsr:@std/encoding@1/base64url"
import webpush from "npm:web-push@3.6.7"

import { json, serve, STATUS_CODE } from "../_shared/http.ts"
import { admin, env } from "../_shared/supabase.ts"
import { messageFor } from "./message.ts"

// Sends a new notification to every browser its recipient allowed pushes on.
//
// Only the database calls this: the trigger in the push_subscriptions
// migration posts the row's id with the service-role key once the insert
// commits. The row is claimed by setting pushed_at, so a repeated call finds
// nothing left to send. A failed send is not retried, since the feed still
// has the row. An endpoint the push service says is gone (404, 410: the
// browser was reset, or the permission revoked) is deleted.

const GONE = [STATUS_CODE.NotFound, STATUS_CODE.Gone]

serve(async (req) => {
  if (callerRole(req) !== "service_role") {
    return json({ error: "Database only" }, STATUS_CODE.Forbidden)
  }

  const { notification_id: id } = await req.json()
  if (typeof id !== "string") {
    return json({ error: "notification_id required" }, STATUS_CODE.BadRequest)
  }

  // Before the claim: missing keys must not use up the row.
  webpush.setVapidDetails(
    env("VAPID_SUBJECT"),
    env("VAPID_PUBLIC_KEY"),
    env("VAPID_PRIVATE_KEY"),
  )

  const db = admin()

  const { data, error } = await db
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .eq("id", id)
    .is("pushed_at", null)
    .select(
      "user_id, type, event_id, application_id, events(title, status), applications(applicant:profiles!applications_applicant_id_fkey(full_name)), recipient:profiles!notifications_user_id_fkey(locale)",
    )
    .maybeSingle()
  if (error) throw error
  if (!data) return json({ sent: 0 })

  const { data: subscriptions, error: subscriptionsError } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", data.user_id)
  if (subscriptionsError) throw subscriptionsError

  const event = one(data.events)
  const message = JSON.stringify(
    messageFor(
      {
        type: data.type,
        event_id: data.event_id,
        application_id: data.application_id,
        event_title: event?.title ?? null,
        event_status: event?.status ?? null,
        applicant_name:
          one(one(data.applications)?.applicant)?.full_name ?? null,
      },
      one(data.recipient)?.locale ?? null,
    ),
  )

  const results = await Promise.allSettled(
    subscriptions.map(({ endpoint, p256dh, auth }) =>
      webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, message),
    ),
  )

  const gone: string[] = []
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return
    if (GONE.includes(result.reason?.statusCode)) {
      gone.push(subscriptions[index].endpoint)
    } else {
      console.error("push failed", result.reason?.statusCode, result.reason)
    }
  })
  if (gone.length) {
    await db.from("push_subscriptions").delete().in("endpoint", gone)
  }

  return json({
    sent: results.filter((result) => result.status === "fulfilled").length,
  })
}, "push failed")

// Every join here is to one row, which the untyped client cannot know: it
// types each embed as a list.
function one<T>(embed: T | T[] | null | undefined) {
  return (Array.isArray(embed) ? embed[0] : embed) ?? null
}

// The gateway has already verified the token's signature; its role says
// whether the database sent it or a client holding the publishable key.
function callerRole(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  )
  try {
    const payload = decodeBase64Url(token.split(".")[1])
    return JSON.parse(new TextDecoder().decode(payload)).role
  } catch {
    return null
  }
}
