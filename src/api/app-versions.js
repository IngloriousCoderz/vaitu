import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { supabase } from "./client.js"

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
