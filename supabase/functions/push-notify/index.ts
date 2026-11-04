import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"

import { STATUS_CODE } from "jsr:@std/http@1/status"
import { callerRole, json, serve } from "npm:@inglorious/supabase@^0.4.0/edge"

import {
  messageFor,
  type PushMessage,
} from "../_shared/notification-message.ts"
import { admin } from "../_shared/supabase.ts"
import { type FcmMessage, send } from "./fcm.ts"

serve(
  async (req) => {
    if (callerRole(req) !== "service_role") {
      return json({ error: "Database only" }, STATUS_CODE.Forbidden)
    }

    const { notification_id: id } = await req.json()
    if (typeof id !== "string") {
      return json({ error: "notification_id required" }, STATUS_CODE.BadRequest)
    }

    const db = admin()

    const { data, error } = await db
      .from("notifications")
      .update({ pushed_at: new Date().toISOString() })
      .eq("id", id)
      .is("pushed_at", null)
      .select(
        "user_id, type, event_id, application_id, applicant_name, event_title, events(title, status), applications(applicant:profiles!applications_applicant_id_fkey(full_name)), recipient:profiles!notifications_user_id_fkey(locale)",
      )
      .maybeSingle()
    if (error) throw error
    if (!data) return json({ sent: 0 })

    const { data: devices, error: devicesError } = await db
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", data.user_id)
    if (devicesError) throw devicesError

    const event = one(data.events)
    const message = messageFor(
      {
        type: data.type,
        event_id: data.event_id,
        application_id: data.application_id,
        event_title: event?.title ?? data.event_title ?? null,
        event_status: event?.status ?? null,
        applicant_name:
          one(one(data.applications)?.applicant)?.full_name ??
          data.applicant_name ??
          null,
      },
      one(data.recipient)?.locale ?? null,
    )

    const results = await Promise.allSettled(
      devices.map(({ token, platform }) =>
        send(fcmMessage(token, platform, message)),
      ),
    )

    let sent = 0
    const gone: string[] = []
    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled" && result.value.ok) {
        sent++
      } else if (
        result.status === "fulfilled" &&
        result.value.status === STATUS_CODE.NotFound
      ) {
        gone.push(devices[index].token)
      } else if (result.status === "fulfilled") {
        console.error(
          "push failed",
          result.value.status,
          await result.value.text(),
        )
      } else {
        console.error("push failed", result.reason)
      }
    }
    if (gone.length) {
      await db.from("push_tokens").delete().in("token", gone)
    }

    return json({ sent })
  },
  { fallbackError: "push failed" },
)

function fcmMessage(
  token: string,
  platform: string,
  { title, body, url }: PushMessage,
): FcmMessage {
  if (platform === "web") {
    return {
      token,
      data: { title, body, url },
      webpush: { headers: { Urgency: "high" } },
    }
  }
  return {
    token,
    notification: { title, body },
    data: { url },
    android: { priority: "high" },
  }
}

// Every join here is to one row, which the untyped client cannot know: it
// types each embed as a list.
function one<T>(embed: T | T[] | null | undefined) {
  return (Array.isArray(embed) ? embed[0] : embed) ?? null
}
