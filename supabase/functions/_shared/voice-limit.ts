import { json, STATUS_CODE } from "./http.ts"
import { admin } from "./supabase.ts"

export type VoiceKind = "transcribe" | "parse"

export function voiceLimitReached() {
  return json({ error: "voice_limit" }, STATUS_CODE.TooManyRequests)
}

export async function claimVoiceUse(userId: string, kind: VoiceKind) {
  const { data, error } = await admin().rpc("claim_voice_use", {
    p_user_id: userId,
    p_kind: kind,
  })
  if (error) throw error
  return data as boolean
}

export async function releaseVoiceUse(userId: string, kind: VoiceKind) {
  const { error } = await admin().rpc("release_voice_use", {
    p_user_id: userId,
    p_kind: kind,
  })
  if (error) console.error("voice use not released", error)
}
