import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { supabase } from "./client.js"

const COLUMNS = "interested_categories, favorite_regions, is_email_opted_out"

export async function fetchMyPreferences() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("errors.notLoggedIn")
  const { data, error } = await supabase
    .from("profiles")
    .select(COLUMNS)
    .eq("id", user.id)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
    .single()
  if (error) throw error
  return data
}

/**
 * Saves some of the preferences, leaving the others as they are.
 * @param {Object} fields - Any of the columns above.
 */
export async function savePreferences(fields) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("errors.notLoggedIn")
  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", user.id)
  if (error) throw error
  return fields
}
