import { createClient } from "@supabase/supabase-js"

// Singleton. Publishable key only — row safety comes from RLS, not the key.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
