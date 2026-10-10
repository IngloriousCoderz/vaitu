import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// The auth flow asks "is there an account for this address?" to route the user
// to login vs signup. That answer is a user-enumeration oracle, so it is
// guarded rather than open:
//   - existence is read from profiles.email (unique index) instead of dumping
//     auth.users through the service role on every keystroke;
//   - attempts are counted per hashed client IP in check_email_rate_limit(),
//     which is the only thing standing between this and a full account dump.
const RATE_LIMIT_WINDOW_MINUTES = 15

async function hashIp(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function clientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("cf-connecting-ip") ?? "unknown"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors })
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const ipHash = await hashIp(clientIp(req))
    const { data: allowed, error: rateError } = await admin.rpc(
      "check_email_rate_limit",
      { p_ip_hash: ipHash },
    )
    if (rateError) throw rateError
    if (!allowed) {
      return Response.json(
        { error: "Too many attempts. Try again in a few minutes." },
        { status: 429, headers: { ...cors, "Retry-After": "900" } },
      )
    }

    const { email } = await req.json()
    if (!email || typeof email !== "string") {
      return Response.json(
        { error: "email is required" },
        { status: 400, headers: cors },
      )
    }

    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle()

    if (error) throw error

    return Response.json({ exists: Boolean(data) }, { headers: cors })
  } catch (err) {
    return Response.json(
      { error: err.message ?? "check failed" },
      { status: 500, headers: cors },
    )
  }
})
