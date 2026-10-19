import { afterAll, expect, test } from "vitest"

import { SEEKER, SENDER, signIn, signOut } from "../testing/index.js"
import { supabase } from "./client.js"

const TEST_TIMEOUT_MS = 60000

afterAll(async () => {
  await signOut()
}, TEST_TIMEOUT_MS)

test(
  "transcription refuses a missing file and a file that belongs to someone else",
  async () => {
    await signIn(SENDER)
    const {
      data: { user: sender },
    } = await supabase.auth.getUser()

    await signIn(SEEKER)
    expect(await invoke("transcribe-audio", {})).toEqual({
      status: 400,
      payload: { error: "audio_path is required" },
    })
    expect(
      await invoke("transcribe-audio", {
        audio_path: `${sender.id}/clip.webm`,
      }),
    ).toEqual({
      status: 403,
      payload: { error: "Not your audio" },
    })
  },
  TEST_TIMEOUT_MS,
)

test(
  "parsing refuses a missing transcript",
  async () => {
    await signIn(SEEKER)
    expect(await invoke("parse-event", {})).toEqual({
      status: 400,
      payload: { error: "transcript is required" },
    })
  },
  TEST_TIMEOUT_MS,
)

test(
  "transcription and parsing refuse a signed-out visitor",
  async () => {
    await signOut()
    expect(
      await invoke("transcribe-audio", { audio_path: "clip.webm" }),
    ).toEqual({
      status: 401,
      payload: { error: "Not logged in" },
    })
    expect(
      await invoke("parse-event", { transcript: "Ada e Leo a Firenze" }),
    ).toEqual({
      status: 401,
      payload: { error: "Not logged in" },
    })
  },
  TEST_TIMEOUT_MS,
)

async function invoke(name, body) {
  const { data, response } = await supabase.functions.invoke(name, { body })
  const status = response?.status ?? 0
  const payload = status >= 400 && response ? await response.json() : data
  return { status, payload }
}
