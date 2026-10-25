import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"
import { json, serve, STATUS_CODE, upstreamError } from "../_shared/http.ts"
import { admin, currentUser, env } from "../_shared/supabase.ts"

const BUCKET = "event-audio"

serve(async (req) => {
  const { audio_path } = await req.json()
  if (!audio_path || typeof audio_path !== "string") {
    return json({ error: "audio_path is required" }, STATUS_CODE.BadRequest)
  }

  const user = await currentUser(req)
  if (!user) return json({ error: "Not logged in" }, STATUS_CODE.Unauthorized)
  // Uploads live under a folder named after their owner.
  const [owner] = audio_path.split("/")
  if (owner !== user.id) {
    return json({ error: "Not your audio" }, STATUS_CODE.Forbidden)
  }

  const { data: audio, error: downloadError } = await admin()
    .storage.from(BUCKET)
    .download(audio_path)
  if (downloadError) throw downloadError

  const dg = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-3&language=it&smart_format=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${env("DEEPGRAM_API_KEY")}`,
        "Content-Type": audio.type || "audio/webm",
      },
      body: audio,
    },
  )
  if (!dg.ok) throw await upstreamError("Deepgram", dg)

  const result = await dg.json()
  const [channel] = result?.results?.channels ?? []
  const [alternative] = channel?.alternatives ?? []
  const transcript: string = alternative?.transcript ?? ""

  return json({ transcript: transcript.trim() || null })
}, "transcription failed")
