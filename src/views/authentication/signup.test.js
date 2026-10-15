// Removes the user it creates with the local service role. The assertions
// sign in with the public key.

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
  const { data, error } = await supabase.auth.signUp({
    email,
    password: SEEKER.password,
    options: { data: { full_name: fullName } },
  })
  expect(error).toBeNull()
  userId = data.user.id
  await signIn({ email, password: SEEKER.password })

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single()
  expect(profileError).toBeNull()
  expect(profile).toEqual({ full_name: fullName, email })

  await createEvent(eventPayload(id))
  const mine = await fetchMyEvents()
  expect(mine.some((event) => event.title === coupleTitle(id))).toBe(true)
})
