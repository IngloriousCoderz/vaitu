import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { supabase } from "./client.js"

// The oldest native build still allowed to run on a platform, and where to
// get a newer one. Readable before sign-in: the gate sits in front of it.
export async function fetchAppVersion(platform) {
  const { data, error } = await supabase
    .from("app_versions")
    .select("min_build, store_url")
    .eq("platform", platform)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
    .maybeSingle()
  if (error) throw error
  return data
}
