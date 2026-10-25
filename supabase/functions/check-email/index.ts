import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"
import { json, serve, STATUS_CODE } from "../_shared/http.ts"
import { admin } from "../_shared/supabase.ts"

// Must match v_window in check_email_rate_limit().
const RATE_LIMIT_WINDOW_MINUTES = 15
const SECONDS_PER_MINUTE = 60
const HEX_RADIX = 16
const HEX_DIGITS_PER_BYTE = 2

// The auth flow asks "is there an account for this address?" to route the user
// to login vs signup. That answer is a user-enumeration oracle, so it is
// guarded rather than open:
//   - existence is read from profiles.email (unique index) instead of dumping
//     auth.users through the service role on every keystroke;
//   - attempts are counted per hashed client IP in check_email_rate_limit(),
//     which is the only thing standing between this and a full account dump.
serve(async (req) => {
  const db = admin()

  const { data: allowed, error: rateError } = await db.rpc(
    "check_email_rate_limit",
    { p_ip_hash: await hashIp(clientIp(req)) },
  )
  if (rateError) throw rateError
  if (!allowed) {
    return json(
      { error: "Too many attempts. Try again in a few minutes." },
      STATUS_CODE.TooManyRequests,
      { "Retry-After": String(RATE_LIMIT_WINDOW_MINUTES * SECONDS_PER_MINUTE) },
    )
  }

  const { email } = await req.json()
  if (!email || typeof email !== "string") {
    return json({ error: "email is required" }, STATUS_CODE.BadRequest)
  }

  const { data, error } = await db
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle()
  if (error) throw error

  return json({ exists: Boolean(data) })
}, "check failed")

function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const [client] = forwarded.split(",")
    return client.trim()
  }
  return req.headers.get("cf-connecting-ip") ?? "unknown"
}

async function hashIp(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(HEX_RADIX).padStart(HEX_DIGITS_PER_BYTE, "0"))
    .join("")
}
