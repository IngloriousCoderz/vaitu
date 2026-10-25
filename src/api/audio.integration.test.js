import { afterAll, expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  removeStoredFile,
  SEEKER,
  SENDER,
  signIn,
  signOut,
} from "../testing/index.js"
import { supabase } from "./client.js"
import { deleteEventAudio, uploadEventAudio } from "./events.js"

const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000

const storedPaths = []

afterAll(async () => {
  try {
    for (const path of storedPaths) await removeStoredFile("event-audio", path)
  } finally {
    await signOut()
  }
}, TEST_TIMEOUT_MS)

test(
  "a signed-in user can upload an audio file and delete it",
  async () => {
    await signIn(SEEKER)
    const webm = await uploadEventAudio(
      new Blob(["webm"], { type: "audio/webm" }),
    )
    const mp4 = await uploadEventAudio(new Blob(["mp4"], { type: "audio/mp4" }))
    storedPaths.push(webm.path, mp4.path)

    expect(webm.path.endsWith(".webm")).toBe(true)
    expect(mp4.path.endsWith(".m4a")).toBe(true)

    const fetched = await fetch(webm.url)
    expect(fetched.ok).toBe(true)
    expect(await fetched.text()).toBe("webm")

    await deleteEventAudio(webm.path)
    await deleteEventAudio(mp4.path)
    storedPaths.length = 0

    const after = await fetch(webm.url)
    expect(after.ok).toBe(false)
  },
  TEST_TIMEOUT_MS,
)

test(
  "a signed-out visitor cannot upload audio",
  async () => {
    await signOut()
    await expect(
      uploadEventAudio(new Blob(["webm"], { type: "audio/webm" })),
    ).rejects.toThrow("Not logged in")
  },
  TEST_TIMEOUT_MS,
)

test(
  "another account cannot upload into someone else's folder",
  async () => {
    await signIn(SEEKER)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const path = `${user.id}/${crypto.randomUUID()}.webm`

    await signIn(SENDER)
    const { error } = await supabase.storage
      .from("event-audio")
      .upload(path, new Blob(["webm"], { type: "audio/webm" }), {
        contentType: "audio/webm",
        upsert: true,
      })
    if (!error) storedPaths.push(path)
    expect(error).not.toBeNull()
  },
  TEST_TIMEOUT_MS,
)
