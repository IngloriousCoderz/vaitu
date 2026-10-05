import { createClient } from "@supabase/supabase-js"

import { SUPABASE_API_PORT } from "../constants.js"

// Dev over LAN needs no manual IP: when the page itself is served from a
// LAN host (live reload, phone browser) and the baked URL is local,
// Supabase lives on the same host. Production builds keep the baked URL.
function supabaseUrl() {
  const baked = import.meta.env.VITE_SUPABASE_URL
  const host =
    typeof window === "undefined" ? "" : (window.location.hostname ?? "")
  const isLanHost = host !== "" && host !== "localhost" && host !== "127.0.0.1"
  const isLocalBaked =
    !baked || baked.includes("localhost") || baked.includes("127.0.0.1")
  if (isLanHost && isLocalBaked) return `http://${host}:${SUPABASE_API_PORT}`
  return baked
}

// Singleton. Publishable key only — row safety comes from RLS, not the key.
export const supabase = createClient(
  supabaseUrl(),
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
