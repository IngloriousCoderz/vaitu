import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"
import { json, serve, STATUS_CODE, upstreamError } from "../_shared/http.ts"
import { currentUser, env } from "../_shared/supabase.ts"

const MODEL = "nvidia/nemotron-3-super-120b-a12b:free"

// From the first "{" to the last "}": models wrap their JSON in prose or
// code fences despite being told not to.
const JSON_OBJECT = /\{[\s\S]*\}/

serve(async (req) => {
  const { transcript } = await req.json()
  if (!transcript || typeof transcript !== "string") {
    return json({ error: "transcript is required" }, STATUS_CODE.BadRequest)
  }

  const user = await currentUser(req)
  if (!user) return json({ error: "Not logged in" }, STATUS_CODE.Unauthorized)

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("OPENROUTER_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: transcript },
      ],
    }),
  })
  if (!res.ok) throw await upstreamError("OpenRouter", res)

  const body = await res.json()
  const [choice] = body?.choices ?? []
  const content: string = choice?.message?.content ?? ""
  const [fields] = content.match(JSON_OBJECT) ?? []
  if (!fields) throw new Error("No JSON in response")

  return json({ fields: JSON.parse(fields) })
}, "parse failed")

// Built per request: a worker can outlive midnight, and "today" anchors the
// year of dates spoken without one.
function systemPrompt() {
  const [today] = new Date().toISOString().split("T")

  return `You extract wedding event data from an Italian voice transcript.
Today is ${today}.
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
}
