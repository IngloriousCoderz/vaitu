import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const BUCKET = "event-audio"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors })
  }

  try {
    const { audio_path } = await req.json()
    if (!audio_path || typeof audio_path !== "string") {
      return Response.json(
        { error: "audio_path is required" },
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
    if (audio_path.split("/")[0] !== user.id) {
      return Response.json(
        { error: "Not your audio" },
        { status: 403, headers: cors },
      )
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )
    const { data: audio, error: downloadError } = await admin.storage
      .from(BUCKET)
      .download(audio_path)
    if (downloadError) throw downloadError

    const deepgramKey = Deno.env.get("DEEPGRAM_API_KEY") ?? ""
    if (!deepgramKey) throw new Error("DEEPGRAM_API_KEY is not set")

    const contentType = audio.type || "audio/webm"
    const dg = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-3&language=it&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramKey}`,
          "Content-Type": contentType,
        },
        body: audio,
      },
    )
    if (!dg.ok) {
      const detail = await dg.text()
      throw new Error(`Deepgram ${dg.status}: ${detail.slice(0, 200)}`)
    }
    const result = await dg.json()
    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ""

    return Response.json(
      { transcript: transcript.trim() || null },
      { headers: cors },
    )
  } catch (err) {
    return Response.json(
      { error: err.message ?? "transcription failed" },
      { status: 500, headers: cors },
    )
  }
})
