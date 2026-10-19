// Creates its own account and deletes it through the local function. The
// service role only removes the account if the function did not.

import { afterAll, expect, test } from "vitest"

import {
  coupleTitle,
  deleteSignedUpUser,
  eventPayload,
  removeStoredFile,
  SEEKER,
  SENDER,
  signIn,
  signOut,
} from "../testing/index.js"
import { uploadIcsFile } from "./applications.js"
import { supabase } from "./client.js"
import { createEvent, fetchMyEvents } from "./events.js"

const ICS = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR"
const TEST_TIMEOUT_MS = 60000

let userId = null
let storedPath = null

afterAll(async () => {
  try {
    if (storedPath) await removeStoredFile("event-ics", storedPath)
    if (userId) await deleteSignedUpUser(userId)
  } finally {
    await signOut()
  }
}, TEST_TIMEOUT_MS)

test(
  "a signed-out visitor cannot delete an account",
  async () => {
    await signOut()
    expect(await invoke("delete-account", {})).toEqual({
      status: 401,
      payload: { error: "Not logged in" },
    })
  },
  TEST_TIMEOUT_MS,
)

test(
  "deleting an account removes that user, their event and their file",
  async () => {
    const id = crypto.randomUUID()
    const email = `vitest-${id}@vaitu.local`
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: SEEKER.password,
      options: { data: { full_name: `Vitest ${id}` } },
    })
    expect(signUpError).toBeNull()
    userId = data.user.id

    await signIn({ email, password: SEEKER.password })
    await createEvent(eventPayload(id))
    const created = (await fetchMyEvents()).find(
      (event) => event.title === coupleTitle(id),
    )
    expect(created).toBeTruthy()

    const fileId = crypto.randomUUID()
    storedPath = `${userId}/${fileId}.ics`
    const fileUrl = await uploadIcsFile(fileId, ICS)

    await signIn(SENDER)
    const {
      data: { user: sender },
    } = await supabase.auth.getUser()
    await signIn({ email, password: SEEKER.password })

    // The body cannot choose a victim. The token decides who is deleted.
    const result = await invoke("delete-account", { user_id: sender.id })
    expect(result).toEqual({ status: 200, payload: { deleted: true } })
    userId = null
    storedPath = null

    const { error: deletedLogin } = await supabase.auth.signInWithPassword({
      email,
      password: SEEKER.password,
    })
    expect(deletedLogin).not.toBeNull()

    await signIn(SENDER)
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", created.id)
      .maybeSingle()
    expect(eventError).toBeNull()
    expect(event).toBeNull()

    const fetched = await fetch(fileUrl)
    expect(fetched.ok).toBe(false)
  },
  TEST_TIMEOUT_MS,
)

async function invoke(name, body) {
  const { data, response } = await supabase.functions.invoke(name, { body })
  const status = response?.status ?? 0
  const payload = status >= 400 && response ? await response.json() : data
  return { status, payload }
}
