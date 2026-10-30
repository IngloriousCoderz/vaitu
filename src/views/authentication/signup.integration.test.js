import { afterAll, expect, test } from "vitest"

import { supabase } from "../../api/client.js"
import { createEvent, fetchMyEvents } from "../../api/events.js"
import {
  coupleTitle,
  deleteSignedUpUser,
  eventPayload,
  SEEKER,
  signIn,
  signOut,
  signUp,
} from "../../testing/index.js"

let userId = null

afterAll(async () => {
  if (userId) await deleteSignedUpUser(userId)
  await signOut()
})

test("a new account can create an event", async () => {
  const id = crypto.randomUUID()
  const email = `vitest-${id}@vaitu.local`
  const fullName = `Vitest ${id}`
  userId = await signUp({ email, fullName: fullName })
  await signIn({ email, password: SEEKER.password })

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, country")
    .eq("id", userId)
    .single()
  expect(profileError).toBeNull()
  expect(profile).toEqual({ full_name: fullName, country: null })

  await createEvent(eventPayload(id))
  const mine = await fetchMyEvents()
  expect(mine.some((event) => event.title === coupleTitle(id))).toBe(true)
})
