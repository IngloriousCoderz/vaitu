import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"

import { STATUS_CODE } from "jsr:@std/http@1/status"
import { currentUser, json, serve } from "npm:@inglorious/supabase@^0.2.0/edge"

import { sha256Hex } from "../_shared/erasure.ts"
import { admin } from "../_shared/supabase.ts"

const USER_BUCKETS = ["avatars", "event-images", "event-ics"]
const LIST_PAGE = 100

// By the link in the deactivation email, which works signed out, or as the
// signed-in user. The database keeps the anonymous history: see
// erase_profile_activity().
serve(
  async (req) => {
    const db = admin()
    const { token } = await req.json().catch(() => ({ token: null }))

    let userId: string
    if (typeof token === "string" && token) {
      const { data, error } = await db
        .from("account_erasures")
        .select("user_id")
        .eq("token_hash", await sha256Hex(token))
        .gt("expires_at", new Date().toISOString())
        .maybeSingle()
      if (error) throw error
      if (!data) return json({ error: "link_expired" }, STATUS_CODE.NotFound)
      userId = data.user_id
    } else {
      const user = await currentUser(db, req)
      if (!user)
        return json({ error: "Not logged in" }, STATUS_CODE.Unauthorized)
      userId = user.id
    }

    for (const bucket of USER_BUCKETS) {
      await removeFolder(db, bucket, userId)
    }

    const { error } = await db.auth.admin.deleteUser(userId)
    if (error) throw error

    return json({ erased: true })
  },
  { fallbackError: "erase failed" },
)

async function removeFolder(
  db: ReturnType<typeof admin>,
  bucket: string,
  folder: string,
) {
  while (true) {
    const { data, error } = await db.storage
      .from(bucket)
      .list(folder, { limit: LIST_PAGE })
    if (error) throw error
    if (!data.length) return
    const { error: removeError } = await db.storage
      .from(bucket)
      .remove(data.map((file) => `${folder}/${file.name}`))
    if (removeError) throw removeError
  }
}
