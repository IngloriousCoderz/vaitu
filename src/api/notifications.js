import { FEED_LIMIT, REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { supabase } from "./client.js"

// Layer 1 of notifications: the in-app feed. Everything else (badges, deep
// links, later Web Push/FCM/APNs senders) reads the same table these return.
// Newest first, capped — this is a bell, not an archive.

export async function fetchMyNotifications() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, is_read, created_at, event_id, application_id, applicant_name, events(id, title, status, category), applications(applicant:profiles!applications_applicant_id_fkey(full_name))",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    type: row.type,
    is_read: row.is_read,
    created_at: row.created_at,
    event_id: row.event_id,
    application_id: row.application_id,
    event_title: row.events?.title ?? null,
    event_status: row.events?.status ?? null,
    // A withdrawal's application is gone, so its row keeps the name itself.
    applicant_name:
      row.applications?.applicant?.full_name ?? row.applicant_name ?? null,
  }))
}

export async function markNotificationRead(id) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_read", false)
    .select("id")
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return data
}

export async function markAllNotificationsRead() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .select("id")
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return data
}
