import { STATUS_CODE } from "jsr:@std/http@1/status"
import { json } from "npm:@inglorious/supabase@^0.2.0/edge"

import { admin } from "./supabase.ts"

export type VoiceKind = "transcribe" | "parse"

export function voiceLimitReached() {
  return json({ error: "voice_limit" }, STATUS_CODE.TooManyRequests)
}

export function voicePaused() {
  return json({ error: "voice_paused" }, STATUS_CODE.TooManyRequests)
}

export async function voiceBudgetReached() {
  const { data, error } = await admin().rpc("voice_budget_reached")
  if (error) throw error
  return data as boolean
}

export async function recordVoiceSeconds(userId: string, seconds: number) {
  const { error } = await admin().rpc("record_voice_seconds", {
    p_user_id: userId,
    p_seconds: seconds,
  })
  if (error) console.error("voice seconds not recorded", error)
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
