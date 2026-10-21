import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Soft-deactivates the caller's account. Who the caller is comes from their
// access token, never from the request body, so nobody can deactivate anyone
// else.
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors })
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const token = (req.headers.get("authorization") ?? "").replace(
      /^Bearer\s+/i,
      "",
    )
    const {
      data: { user },
    } = await admin.auth.getUser(token)
    if (!user) {
      return Response.json(
        { error: "Not logged in" },
        { status: 401, headers: cors },
      )
    }

    // The sent applications go first: if the profile flag below fails, the
    // caller can repeat the call and it succeeds — no window where someone
    // inactive keeps applications an organizer could pick.
    const { error: sentError } = await admin
      .from("applications")
      .delete()
      .eq("applicant_id", user.id)
    if (sentError) throw sentError

    // Open events of theirs end the same way (received applications cascade).
    const { error: openError } = await admin
      .from("events")
      .delete()
      .eq("sender_id", user.id)
      .eq("status", "open")
    if (openError) throw openError

    const { error } = await admin
      .from("profiles")
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (error) throw error

    return Response.json({ deactivated: true }, { headers: cors })
  } catch (err) {
    return Response.json(
      { error: err.message ?? "deactivate failed" },
      { status: 500, headers: cors },
    )
  }
})
