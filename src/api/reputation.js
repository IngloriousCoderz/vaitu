import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { supabase } from "./client.js"

/**
 * The stats of these profiles, by id. Yours and those of your applicants: the
 * others are left out.
 * @param {string[]} profileIds
 */
export async function fetchProfileStats(profileIds) {
  const { data, error } = await supabase
    .rpc("profile_stats", { p_profile_ids: profileIds })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return Object.fromEntries(data.map((row) => [row.profile_id, row]))
}

/**
 * The latest written reviews of these profiles, as lists by id.
 * @param {string[]} profileIds
 */
export async function fetchProfileReviews(profileIds) {
  const { data, error } = await supabase
    .rpc("profile_reviews", { p_profile_ids: profileIds })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  const byProfile = {}
  for (const row of data) (byProfile[row.profile_id] ??= []).push(row)
  return byProfile
}

export async function submitJobReview({
  application_id,
  outcome,
  rating,
  comment,
}) {
  const isCompleted = outcome === "completed"
  const { error } = await supabase.rpc("submit_job_review", {
    p_application_id: application_id,
    p_outcome: outcome,
    p_rating: isCompleted ? rating : null,
    p_comment: isCompleted ? comment : null,
  })
  if (error) throw error
  return true
}
