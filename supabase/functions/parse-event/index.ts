import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const MODEL = "nvidia/nemotron-3-super-120b-a12b:free"

const SYSTEM = `You extract wedding event data from an Italian voice transcript.
Today is ${new Date().toISOString().slice(0, 10)}.
Respond with JSON only, no other text, using exactly these keys (null when unknown):
{
  "spouse_first_name_1": string | null,
  "spouse_first_name_2": string | null,
  "location": string | null,
  "country": string | null,
  "region": string | null,
  "style": "editorial" | "documentary" | "reportage" | "classic" | "film" | "fine_art" | null,
  "event_date": "YYYY-MM-DD" | null
}
Rules: first names only, no surnames. Country in English ("Italy"). Style must be one of the listed values or null. For event_date: use the stated year when given, otherwise use the next upcoming occurrence of that day and month relative to today (never a past date); null only when no day/month can be determined.`

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors })
  }

  try {
    const { transcript } = await req.json()
    if (!transcript || typeof transcript !== "string") {
      return Response.json(
        { error: "transcript is required" },
        { status: 400, headers: cors },
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { error: "Not logged in" },
        { status: 401, headers: cors },
      )
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? ""
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set")

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: transcript },
        ],
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 200)}`)
    }
    const body = await res.json()
    const content = body?.choices?.[0]?.message?.content ?? ""
    const start = content.indexOf("{")
    const end = content.lastIndexOf("}")
    if (start < 0 || end <= start) throw new Error("No JSON in response")
    const fields = JSON.parse(content.slice(start, end + 1))

    return Response.json({ fields }, { headers: cors })
  } catch (err) {
    return Response.json(
      { error: err.message ?? "parse failed" },
      { status: 500, headers: cors },
    )
  }
})
