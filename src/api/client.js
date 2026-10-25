import { createClient } from "@supabase/supabase-js"

import { SUPABASE_API_PORT } from "../constants/index.js"

// Whether this page load is the landing of a signup confirmation link. Read
// before the client exists: it consumes the link's tokens from the hash and
// wipes them from the address bar.
export const isSignupConfirmation = readSignupConfirmation()

// Singleton. Publishable key only — row safety comes from RLS, not the key.
export const supabase = createClient(
  supabaseUrl(),
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

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

// The implicit flow returns the session in the hash, tagged with what issued
// it. A failed link (expired, already used) carries an error instead.
function readSignupConfirmation() {
  if (typeof window === "undefined") return false
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  return params.get("type") === "signup" && params.has("access_token")
}
