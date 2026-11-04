import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"

import { STATUS_CODE } from "jsr:@std/http@1/status"
import {
  currentUser,
  env,
  json,
  serve,
  upstreamError,
} from "npm:@inglorious/supabase@^0.4.0/edge"

import { alertProviderLimit, alertVoiceBudget } from "../_shared/alerts.ts"
import { admin } from "../_shared/supabase.ts"
import {
  claimVoiceUse,
  recordVoiceSeconds,
  releaseVoiceUse,
  voiceBudgetReached,
  voiceLimitReached,
  voicePaused,
} from "../_shared/voice-limit.ts"
import { deepgramLanguage } from "./language.ts"

// The app records at most 2 minutes at 64 kbps, under 1 MB. Deepgram bills by
// the minute, and 10 MB of low-bitrate audio would be most of an hour.
const MAX_AUDIO_BYTES = 3 * 1024 * 1024
const UNKNOWN_DURATION_SECONDS = 120

// The recording only passes through here, in memory: it is never stored.
serve(
  async (req) => {
    const user = await currentUser(admin(), req)
    if (!user) return json({ error: "Not logged in" }, STATUS_CODE.Unauthorized)

    const audio = await req.arrayBuffer()
    if (!audio.byteLength) {
      return json({ error: "audio is required" }, STATUS_CODE.BadRequest)
    }
    if (audio.byteLength > MAX_AUDIO_BYTES) {
      return json({ error: "audio is too large" }, STATUS_CODE.ContentTooLarge)
    }

    if (await voiceBudgetReached()) {
      await alertVoiceBudget()
      return voicePaused()
    }
    if (!(await claimVoiceUse(user.id, "transcribe")))
      return voiceLimitReached()

    const locale = new URL(req.url).searchParams.get("locale")
    let dg: Response
    try {
      dg = await fetch(
        `https://api.deepgram.com/v1/listen?model=nova-3&language=${deepgramLanguage(locale)}&smart_format=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${env("DEEPGRAM_API_KEY")}`,
            "Content-Type": req.headers.get("content-type") || "audio/webm",
          },
          body: audio,
        },
      )
    } catch (err) {
      await releaseVoiceUse(user.id, "transcribe")
      throw err
    }
    if (!dg.ok) {
      await releaseVoiceUse(user.id, "transcribe")
      await alertProviderLimit("deepgram", dg.status)
      throw await upstreamError("Deepgram", dg)
    }

    const result = await dg.json()
    await recordVoiceSeconds(
      user.id,
      Number(result?.metadata?.duration) || UNKNOWN_DURATION_SECONDS,
    )
    const [channel] = result?.results?.channels ?? []
    const [alternative] = channel?.alternatives ?? []
    const transcript: string = alternative?.transcript ?? ""

    return json({ transcript: transcript.trim() || null })
  },
  { fallbackError: "transcription failed" },
)
