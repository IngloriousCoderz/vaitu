import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"

import { STATUS_CODE } from "jsr:@std/http@1/status"
import {
  currentUser,
  env,
  json,
  serve,
} from "npm:@inglorious/supabase@^0.4.0/edge"

import { sendEmail } from "../_shared/email.ts"
import { sha256Hex } from "../_shared/erasure.ts"
import { admin } from "../_shared/supabase.ts"
import wording from "./wording.json" with { type: "json" }

type Locale = keyof typeof wording

const FALLBACK_LOCALE: Locale = "en"
const IMAGES_BUCKET = "job-images"

// The sent applications are withdrawn, so organizers cannot pick someone who
// left, and the open jobs are deleted. Past jobs with winners stay: they
// are other users' points and history.
serve(
  async (req) => {
    const db = admin()
    const user = await currentUser(db, req)
    if (!user) return json({ error: "Not logged in" }, STATUS_CODE.Unauthorized)

    const { data: open, error: openError } = await db
      .from("jobs")
      .select("image_urls")
      .eq("sender_id", user.id)
      .eq("status", "open")
      .is("deleted_at", null)
    if (openError) throw openError

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

    const images = open
      .flatMap((job) => job.image_urls)
      .map((url) => imagePath(url, user.id))
      .filter((path): path is string => path !== null)
    if (images.length) {
      const { error: removeError } = await db.storage
        .from(IMAGES_BUCKET)
        .remove(images)
      if (removeError) console.error("job images not removed", removeError)
    }

    // The account is deactivated either way: a failed email must not undo that.
    try {
      await emailErasureLink(db, user.id, user.email)
    } catch (err) {
      console.error("deactivation email failed", err)
    }

    return json({ deactivated: true })
  },
  { fallbackError: "deactivate failed" },
)

// Only files in the user's own folder: image_urls is written by the client.
function imagePath(url: string, userId: string) {
  const marker = `/${IMAGES_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  const [path] = url.slice(index + marker.length).split(/[?#]/)
  return path.startsWith(`${userId}/`) ? decodeURIComponent(path) : null
}

async function emailErasureLink(
  db: ReturnType<typeof admin>,
  userId: string,
  email: string | undefined,
) {
  if (!email) return

  const token = crypto.randomUUID() + crypto.randomUUID()
  await db.from("account_erasures").delete().eq("user_id", userId)
  const { error } = await db
    .from("account_erasures")
    .insert({ token_hash: await sha256Hex(token), user_id: userId })
  if (error) throw error

  const { data: profile } = await db
    .from("profiles")
    .select("locale")
    .eq("id", userId)
    .maybeSingle()
  const locale = profile?.locale
  const lines = wording[locale as Locale] ?? wording[FALLBACK_LOCALE]
  const link = `${env("APP_URL")}/erase-account?token=${token}&lang=${locale ?? FALLBACK_LOCALE}`

  await sendEmail(email, lines.subject, lines.body.replace("{{link}}", link))
}
