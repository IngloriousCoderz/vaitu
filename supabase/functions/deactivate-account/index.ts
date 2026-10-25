import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"
import { json, serve, STATUS_CODE } from "../_shared/http.ts"
import { admin, currentUser } from "../_shared/supabase.ts"

// Soft-deactivates the caller's account, and only theirs.
//
// The applications they sent are deleted, the same as an account deletion:
// an organizer cannot select someone who is not on the platform, so their
// candidacy must be gone from the received list the moment they leave.
// Their open events go as well, and the applications received on those events
// cascade away with them — an open event nobody can ever be picked for has no
// reason to exist. Past events with winners are part of other users' points
// and history, so they stay, and stay readable for the winner.
//
// Auth user, profile, closed or assigned events and storage stay in place so
// we can email the person to come back. Signing in again runs touch_login()
// and reactivates.
serve(async (req) => {
  const user = await currentUser(req)
  if (!user) return json({ error: "Not logged in" }, STATUS_CODE.Unauthorized)

  const db = admin()

  // The sent applications go first: if the profile flag below fails, the
  // caller can repeat the call and it succeeds — no window where someone
  // inactive keeps applications an organizer could pick.
  const { error: sentError } = await db
    .from("applications")
    .delete()
    .eq("applicant_id", user.id)
  if (sentError) throw sentError

  // Open events of theirs end the same way (received applications cascade).
  const { error: openError } = await db
    .from("events")
    .delete()
    .eq("sender_id", user.id)
    .eq("status", "open")
  if (openError) throw openError

  const now = new Date().toISOString()
  const { error } = await db
    .from("profiles")
    .update({ is_active: false, deactivated_at: now, updated_at: now })
    .eq("id", user.id)
  if (error) throw error

  return json({ deactivated: true })
}, "deactivate failed")
