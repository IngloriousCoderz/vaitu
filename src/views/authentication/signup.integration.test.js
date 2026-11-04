import { afterAll, expect, test } from "vitest"

import { supabase } from "../../api/client.js"
import { createJob, fetchMyJobs } from "../../api/jobs.js"
import {
  coupleTitle,
  deleteSignedUpUser,
  jobPayload,
  PASSWORD,
  signIn,
  signOut,
  signUp,
} from "../../testing/index.js"

let userId = null

afterAll(async () => {
  if (userId) await deleteSignedUpUser(userId)
  await signOut()
})

test("a new account can create a job", async () => {
  const id = crypto.randomUUID()
  const email = `vitest-${id}@vaitu.local`
  const fullName = `Vitest ${id}`
  userId = await signUp({ email, fullName: fullName })
  await signIn({ email, password: PASSWORD })

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, country")
    .eq("id", userId)
    .single()
  expect(profileError).toBeNull()
  expect(profile).toEqual({ full_name: fullName, country: null })

  await createJob(jobPayload(id))
  const mine = await fetchMyJobs()
  expect(mine.some((job) => job.title === coupleTitle(id))).toBe(true)
})
