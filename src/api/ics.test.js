import { afterAll, expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  removeStoredFile,
  SEEKER,
  SENDER,
  signIn,
  signOut,
} from "../testing/index.js"
import { uploadIcsFile } from "./applications.js"
import { supabase } from "./client.js"

const ICS = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR"
const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000

let storedPath = null

afterAll(async () => {
  try {
    if (storedPath) await removeStoredFile("event-ics", storedPath)
  } finally {
    await signOut()
  }
}, TEST_TIMEOUT_MS)

test(
  "a signed-in user can upload a calendar file and read it back",
  async () => {
    const applicationId = crypto.randomUUID()
    await signIn(SEEKER)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    storedPath = `${user.id}/${applicationId}.ics`

    const url = await uploadIcsFile(applicationId, ICS)
    const fetched = await fetch(url)
    expect(fetched.ok).toBe(true)
    expect(await fetched.text()).toContain("BEGIN:VCALENDAR")
  },
  TEST_TIMEOUT_MS,
)

test(
  "a signed-out visitor cannot upload one",
  async () => {
    await signOut()
    await expect(uploadIcsFile(crypto.randomUUID(), ICS)).rejects.toThrow(
      "Not logged in",
    )
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
    const path = `${user.id}/${crypto.randomUUID()}.ics`

    await signIn(SENDER)
    const { error } = await supabase.storage
      .from("event-ics")
      .upload(path, new Blob([ICS], { type: "text/calendar" }), {
        contentType: "text/calendar",
        upsert: true,
      })
    if (!error) storedPath = path
    expect(error).not.toBeNull()
  },
  TEST_TIMEOUT_MS,
)
