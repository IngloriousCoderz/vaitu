import { MIN_TEXT_LENGTH, REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { supabase } from "./client.js"
import { toViewModel } from "./events.js"

const ICS_BUCKET = "event-ics"

// My applications with their events, newest first. Shape reuses the event
// view model plus application fields so cards render unchanged.
export async function fetchMyApplications() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, events(id, category, status, title, location, region, event_date, application_deadline, created_at, image_urls, details)",
    )
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return data.map((row) => ({
    ...toViewModel(row.events),
    application_id: row.id,
    applicationStatus: row.status,
  }))
}

export async function fetchMyApplicationMap() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}
  const { data, error } = await supabase
    .from("applications")
    .select("id,event_id")
    .eq("applicant_id", user.id)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return Object.fromEntries(data.map((row) => [row.event_id, row.id]))
}

export async function fetchApplicationDetail(application_id) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, motivation, created_at, events(id, category, status, title, location, region, event_date, application_deadline, created_at, image_urls, details)",
    )
    .eq("id", application_id)
    .eq("applicant_id", user.id)
    .single()
  if (error) throw error
  return {
    ...toViewModel(data.events),
    application_id: data.id,
    applicationStatus: data.status,
    motivation: data.motivation,
  }
}

export async function updateMotivation(application_id, motivation) {
  if (motivation.trim().length < MIN_TEXT_LENGTH)
    throw new Error("Motivation is required")
  const { data: current, error: readError } = await supabase
    .from("applications")
    .select("status")
    .eq("id", application_id)
    .single()
  if (readError) throw readError
  if (current.status !== "pending" && current.status !== "shortlisted") {
    throw new Error("Only pending applications can be edited")
  }
  const { error } = await supabase
    .from("applications")
    .update({ motivation: motivation.trim() })
    .eq("id", application_id)
  if (error) throw error
  return true
}

// At any stage, the winner's too: the database then gives the sender back the
// shortlist and reopens the event (reopen_on_winner_withdrawn).
export async function withdrawApplication(application_id) {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", application_id)
  if (error) throw error
  return true
}

export async function updateApplicationStatus(application_id, status) {
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", application_id)
  if (error) throw error
  return true
}

export async function fetchReceivedDetail(application_id) {
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, motivation, created_at, event_id, applicant:profiles!applications_applicant_id_fkey(full_name, website, instagram_handle, country)",
    )
    .eq("id", application_id)
    .single()
  if (error) throw error
  return data
}

export async function uploadIcsFile(application_id, ics) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const path = `${user.id}/${application_id}.ics`
  const { error } = await supabase.storage
    .from(ICS_BUCKET)
    .upload(path, new Blob([ics], { type: "text/calendar" }), {
      contentType: "text/calendar",
      upsert: true,
    })
  if (error) throw error
  return supabase.storage.from(ICS_BUCKET).getPublicUrl(path).data.publicUrl
}
