import { createClient } from "@supabase/supabase-js"

import { SUPABASE_API_PORT } from "../constants/index.js"

export const isSignupConfirmation = readSignupConfirmation()

export const supabase = createClient(
  supabaseUrl(),
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

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

function readSignupConfirmation() {
  if (typeof window === "undefined") return false
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  return params.get("type") === "signup" && params.has("access_token")
}
