import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"
import { sendEmail } from "../_shared/email.ts"
import { sha256Hex } from "../_shared/erasure.ts"
import { json, serve, STATUS_CODE } from "../_shared/http.ts"
import { admin, currentUser, env } from "../_shared/supabase.ts"
import wording from "./wording.json" with { type: "json" }

type Locale = keyof typeof wording

const FALLBACK_LOCALE: Locale = "en"

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

  // The account is deactivated either way: a failed email must not undo that.
  try {
    await emailErasureLink(db, user.id, user.email)
  } catch (err) {
    console.error("deactivation email failed", err)
  }

  return json({ deactivated: true })
}, "deactivate failed")

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
  const link = `${env("APP_URL")}/erase-account?token=${token}`

  await sendEmail(email, lines.subject, lines.body.replace("{{link}}", link))
}
