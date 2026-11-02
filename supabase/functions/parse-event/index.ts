import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"

import { STATUS_CODE } from "jsr:@std/http@1/status"
import {
  currentUser,
  env,
  json,
  serve,
  upstreamError,
} from "npm:@inglorious/supabase@^0.2.0/edge"

import { alertProviderLimit } from "../_shared/alerts.ts"
import { admin } from "../_shared/supabase.ts"
import {
  claimVoiceUse,
  releaseVoiceUse,
  voiceLimitReached,
} from "../_shared/voice-limit.ts"
import { offeredJobTypes, systemPrompt, toEventFields } from "./schema.ts"

// Free models get withdrawn or rate-limited without notice: OpenRouter moves
// down this list when one fails, and openrouter/free picks any that is free.
const MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
  "openrouter/free",
]

const JSON_OBJECT = /\{[\s\S]*\}/
const MAX_TRANSCRIPT_LENGTH = 5000

serve(
  async (req) => {
    const { transcript, job_type, job_types } = await req.json()
    if (!transcript || typeof transcript !== "string") {
      return json({ error: "transcript is required" }, STATUS_CODE.BadRequest)
    }

    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return json({ error: "transcript is too long" }, STATUS_CODE.BadRequest)
    }

    const user = await currentUser(admin(), req)
    if (!user) return json({ error: "Not logged in" }, STATUS_CODE.Unauthorized)

    if (!(await claimVoiceUse(user.id, "parse"))) return voiceLimitReached()

    const offered = offeredJobTypes(job_types)
    const current = offered.includes(job_type) ? job_type : null
    const [today] = new Date().toISOString().split("T")

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("OPENROUTER_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        models: MODELS,
        messages: [
          { role: "system", content: systemPrompt(today, offered, current) },
          { role: "user", content: transcript },
        ],
      }),
    })
    if (!res.ok) {
      await releaseVoiceUse(user.id, "parse")
      await alertProviderLimit("openrouter", res.status)
      throw await upstreamError("OpenRouter", res)
    }

    const body = await res.json()
    // OpenRouter can answer 200 and still report that every model failed.
    if (body?.error) {
      await releaseVoiceUse(user.id, "parse")
      await alertProviderLimit("openrouter", body.error.code)
      throw new Error(`OpenRouter ${body.error.code}: ${body.error.message}`)
    }
    const [choice] = body?.choices ?? []
    const content: string = choice?.message?.content ?? ""
    const [fields] = content.match(JSON_OBJECT) ?? []
    if (!fields) throw new Error("No JSON in response")

    return json({ fields: toEventFields(JSON.parse(fields), offered, current) })
  },
  { fallbackError: "parse failed" },
)
