import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors })
  }

  try {
    const { email } = await req.json()
    if (!email || typeof email !== "string") {
      return Response.json({ error: "email is required" }, { status: 400 })
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )
    const { data, error } = await admin.auth.admin.listUsers()
    if (error) throw error

    const exists = (data?.users ?? []).some(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase(),
    )
    return Response.json({ exists })
  } catch (err) {
    return Response.json(
      { error: err.message ?? "check failed" },
      { status: 500 },
    )
  }
})
