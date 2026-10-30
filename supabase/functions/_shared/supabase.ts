import { createClient } from "npm:@supabase/supabase-js@2"

export function env(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not set`)
  return value
}

export function admin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"))
}

// The caller comes from their access token, never from the request body.
export async function currentUser(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  )
  if (!token) return null

  const { data } = await admin().auth.getUser(token)
  return data.user
}
