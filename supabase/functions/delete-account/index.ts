import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Every bucket where a user's uploads live, each under a folder named after
// their id (the storage policies only let them write there).
const BUCKETS = ["event-images", "event-audio", "event-ics", "avatars"]

// Deletes the caller's own account. Who the caller is comes from their access
// token, never from the request body, so nobody can delete anyone else.
//
// Files go first: storage does not cascade, and once the user is gone nothing
// links those folders to anyone. Then the auth user, which cascades through
// the database: profile, events (with the applications they received) and
// applications sent.
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

    for (const bucket of BUCKETS) {
      const paths = await listFiles(admin.storage.from(bucket), user.id)
      if (!paths.length) continue
      const { error } = await admin.storage.from(bucket).remove(paths)
      if (error) throw error
    }

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error

    return Response.json({ deleted: true }, { headers: cors })
  } catch (err) {
    return Response.json(
      { error: err.message ?? "delete failed" },
      { status: 500, headers: cors },
    )
  }
})

// Every file under `folder`, however deep: storage lists one level at a time,
// and an entry without an id is a subfolder.
async function listFiles(bucket, folder) {
  const { data, error } = await bucket.list(folder, { limit: 1000 })
  if (error) throw error

  const paths = []
  for (const entry of data ?? []) {
    const path = `${folder}/${entry.name}`
    if (entry.id) paths.push(path)
    else paths.push(...(await listFiles(bucket, path)))
  }
  return paths
}
