import { supabase } from "./client.js"
import { toViewModel } from "./events.js"

// My applications with their events, newest first. Shape reuses the event
// view model plus application fields so cards render unchanged.
export async function fetchMyBids() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, events(id, category, title, location, region, event_date, application_deadline, created_at, details)",
    )
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false })
    .abortSignal(AbortSignal.timeout(15000))
  if (error) throw error
  return data.map((row) => ({
    ...toViewModel(row.events),
    application_id: row.id,
    application_status: row.status,
    applied_at: row.created_at,
  }))
}

export async function fetchMyApplicationEventIds() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("applications")
    .select("event_id")
    .eq("applicant_id", user.id)
    .abortSignal(AbortSignal.timeout(15000))
  if (error) throw error
  return data.map((row) => row.event_id)
}

export async function fetchBidDetail(application_id) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, motivation, created_at, events(id, category, title, location, region, event_date, application_deadline, created_at, details)",
    )
    .eq("id", application_id)
    .eq("applicant_id", user.id)
    .single()
  if (error) throw error
  return {
    ...toViewModel(data.events),
    application_id: data.id,
    application_status: data.status,
    applied_at: data.created_at,
    motivation: data.motivation,
  }
}

export async function updateMotivation(application_id, motivation) {
  if (motivation.trim().length === 0) throw new Error("Motivation is required")
  const { error } = await supabase
    .from("applications")
    .update({ motivation: motivation.trim() })
    .eq("id", application_id)
  if (error) throw error
  return true
}

export async function withdrawApplication(application_id) {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", application_id)
  if (error) throw error
  return true
}
