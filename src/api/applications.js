import {
  DAY_MS,
  MIN_TEXT_LENGTH,
  MS_PER_SECOND,
  REQUEST_TIMEOUT_MS,
} from "../constants/index.js"
import { supabase } from "./client.js"
import { toViewModel } from "./jobs.js"

const ICS_BUCKET = "job-ics"
const ICS_LINK_SECONDS = DAY_MS / MS_PER_SECOND

export async function fetchMyApplications() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, jobs!inner(id, setting, profession, status, title, location, region, job_date, application_deadline, created_at, image_urls, details)",
    )
    .eq("applicant_id", user.id)
    .neq("status", "withdrawn")
    .order("created_at", { ascending: false })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return data.map((row) => ({
    ...toViewModel(row.jobs),
    application_id: row.id,
    applicationStatus: row.status,
  }))
}

/**
 * Your live applications as the feed needs them: the application of each job
 * you applied to, and the jobs you won, for jobs from today on. Past ones
 * never show in the feed, and every id goes into its URL.
 * @param {string} today - Local date, YYYY-MM-DD.
 * @returns {Promise<{ appliedMap: Record<string, string>, wonJobIds: string[] }>}
 */
export async function fetchMyApplicationMap(today) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { appliedMap: {}, wonJobIds: [] }
  const { data, error } = await supabase
    .from("applications")
    .select("id,job_id,status,jobs!inner(job_date)")
    .eq("applicant_id", user.id)
    .neq("status", "withdrawn")
    .gte("jobs.job_date", today)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return {
    appliedMap: Object.fromEntries(data.map((row) => [row.job_id, row.id])),
    wonJobIds: data
      .filter((row) => row.status === "selected")
      .map((row) => row.job_id),
  }
}

export async function fetchApplicationDetail(application_id) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, motivation, created_at, job_reviews(outcome, rating, comment), job_agreements(amount, currency, status), job_settlements(role, is_settled), jobs!inner(id, setting, profession, status, title, location, region, job_date, application_deadline, created_at, image_urls, details, job_pay(kind, amount_min, amount_max, currency))",
    )
    .eq("id", application_id)
    .eq("applicant_id", user.id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error("errors.applicationGone")
  return {
    ...toViewModel(data.jobs),
    application_id: data.id,
    applicationStatus: data.status,
    motivation: data.motivation,
    review: data.job_reviews ?? null,
    agreement: data.job_agreements ?? null,
    settlements: data.job_settlements ?? [],
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

export async function withdrawApplication(application_id) {
  const { error } = await supabase.rpc("withdraw_application", {
    p_application_id: application_id,
  })
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
    .select("id, status, motivation, created_at, job_id")
    .eq("id", application_id)
    .single()
  if (error) throw error
  const applicants = await fetchApplicants([data.id])
  return { ...data, applicant: applicants[data.id] ?? null }
}

export async function fetchApplicants(application_ids) {
  if (!application_ids.length) return {}
  const { data, error } = await supabase.rpc("applicant_profiles", {
    p_application_ids: application_ids,
  })
  if (error) throw error
  return Object.fromEntries(
    data.map(({ application_id, ...applicant }) => [application_id, applicant]),
  )
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
  const { data, error: linkError } = await supabase.storage
    .from(ICS_BUCKET)
    .createSignedUrl(path, ICS_LINK_SECONDS)
  if (linkError) throw linkError
  return data.signedUrl
}
