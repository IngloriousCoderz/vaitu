import { createClient } from "npm:@supabase/supabase-js@2"

// The edge runtime injects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY itself;
// the third-party keys come from secrets (supabase/functions/.env locally).
export function env(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not set`)
  return value
}

// Bypasses RLS: use it only for work the caller is already allowed to do.
export function admin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"))
}

// Who the caller is comes from their access token, never from the request
// body. Null for the anon key or an expired session.
export async function currentUser(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  )
  if (!token) return null

  const { data } = await admin().auth.getUser(token)
  return data.user
}
