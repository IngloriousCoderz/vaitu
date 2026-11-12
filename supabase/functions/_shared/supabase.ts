import { env } from "npm:@inglorious/supabase@^0.10.0/edge"
import { createClient } from "npm:@supabase/supabase-js@2"

export function admin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"))
}
