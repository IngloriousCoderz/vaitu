import { afterAll, expect, test } from "vitest"

import { ANTONY, signIn, signOut } from "../testing/index.js"
import { supabase } from "./client.js"

const TEST_TIMEOUT_MS = 60000

afterAll(async () => {
  await signOut()
}, TEST_TIMEOUT_MS)

test(
  "transcription refuses an empty recording",
  async () => {
    await signIn(ANTONY)
    expect(await invoke("transcribe-audio", new Blob([]))).toEqual({
      status: 400,
      payload: { error: "audio is required" },
    })
  },
  TEST_TIMEOUT_MS,
)

test(
  "parsing refuses a missing transcript",
  async () => {
    await signIn(ANTONY)
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
    expect(await invoke("transcribe-audio", new Blob(["clip"]))).toEqual({
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
