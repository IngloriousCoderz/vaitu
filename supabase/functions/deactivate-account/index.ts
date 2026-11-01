import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"
import { json, serve, STATUS_CODE } from "../_shared/http.ts"
import { admin, currentUser } from "../_shared/supabase.ts"

// The sent applications are withdrawn, so organizers cannot pick someone who
// left, and the open events are deleted. Past events with winners stay: they
// are other users' points and history.
serve(async (req) => {
  const user = await currentUser(req)
  if (!user) return json({ error: "Not logged in" }, STATUS_CODE.Unauthorized)

  const db = admin()

  // This goes first: if the profile flag below fails, the caller can repeat
  // the call and it succeeds — no window where someone inactive keeps
  // applications an organizer could pick.
  const { error: retireError } = await db.rpc("retire_profile_activity", {
    p_user_id: user.id,
  })
  if (retireError) throw retireError

  const now = new Date().toISOString()
  const { error } = await db
    .from("profiles")
    .update({ is_active: false, deactivated_at: now, updated_at: now })
    .eq("id", user.id)
  if (error) throw error

  return json({ deactivated: true })
}, "deactivate failed")
