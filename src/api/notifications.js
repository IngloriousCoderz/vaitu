import { FEED_LIMIT, REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { fetchApplicants } from "./applications.js"
import { supabase } from "./client.js"

export async function fetchMyNotifications() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("errors.notLoggedIn")
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, is_read, created_at, job_id, application_id, applicant_name, job_title, jobs(id, title, status, setting)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  const [applicants, posters] = await Promise.all([
    fetchApplicants(data.map((row) => row.application_id).filter(Boolean)),
    fetchPosterNames([
      ...new Set(data.map((row) => row.job_id).filter(Boolean)),
    ]),
  ])
  return data.map((row) => ({
    id: row.id,
    type: row.type,
    is_read: row.is_read,
    created_at: row.created_at,
    job_id: row.job_id,
    application_id: row.application_id,
    job_title: row.jobs?.title ?? row.job_title ?? null,
    job_status: row.jobs?.status ?? null,
    applicant_name:
      applicants[row.application_id]?.full_name ?? row.applicant_name ?? null,
    poster_name: posters[row.job_id] ?? null,
  }))
}

async function fetchPosterNames(job_ids) {
  if (!job_ids.length) return {}
  const { data, error } = await supabase.rpc("notification_poster_names", {
    p_job_ids: job_ids,
  })
  if (error) throw error
  return Object.fromEntries(
    data.map(({ job_id, full_name }) => [job_id, full_name]),
  )
}

export async function markNotificationRead(id) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("errors.notLoggedIn")
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
  if (!user) throw new Error("errors.notLoggedIn")
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
