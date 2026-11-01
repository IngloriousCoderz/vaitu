import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { supabase } from "./client.js"

export async function reportContent({
  target_type,
  target_id,
  reason,
  details,
}) {
  const { error } = await supabase.functions.invoke("report-content", {
    body: { target_type, target_id, reason, details },
  })
  if (error) throw error
  return true
}

export async function blockUser(user_id) {
  const { error } = await supabase.rpc("block_user", { p_user_id: user_id })
  if (error) throw error
  return true
}

export async function unblockUser(user_id) {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocked_id", user_id)
  if (error) throw error
  return true
}

export async function fetchMyBlocks() {
  const { data, error } = await supabase
    .from("blocks")
    .select("blocked_id, blocked_name")
    .order("created_at", { ascending: false })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return data
}
