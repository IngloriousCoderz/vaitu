import { afterAll, expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  deleteSignedUpUser,
  PASSWORD,
  signIn,
  signOut,
  signUp,
} from "../testing/index.js"
import { supabase } from "./client.js"
import { fetchMyFeedDefaults } from "./events.js"

const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000

let userId = null

afterAll(async () => {
  try {
    if (userId) await deleteSignedUpUser(userId)
  } finally {
    await signOut()
  }
}, TEST_TIMEOUT_MS)

test(
  "the feed defaults are the regions and categories saved on the profile",
  async () => {
    const id = crypto.randomUUID()
    const email = `vitest-${id}@vaitu.local`
    userId = await signUp({ email, fullName: `Vitest ${id}` })

    await signIn({ email, password: PASSWORD })
    expect(await fetchMyFeedDefaults()).toEqual({
      favorite_regions: [],
      interested_job_types: [],
      professions: [],
    })

    const { error } = await supabase
      .from("profiles")
      .update({
        favorite_regions: ["Tuscany", "Provence"],
        interested_job_types: ["wedding_photographer"],
        professions: ["cleaner"],
      })
      .eq("id", userId)
    expect(error).toBeNull()
    expect(await fetchMyFeedDefaults()).toEqual({
      favorite_regions: ["Tuscany", "Provence"],
      interested_job_types: ["wedding_photographer"],
      professions: ["cleaner"],
    })
  },
  TEST_TIMEOUT_MS,
)

test(
  "a signed-out visitor has no feed defaults",
  async () => {
    await signOut()
    expect(await fetchMyFeedDefaults()).toEqual({
      favorite_regions: [],
      interested_job_types: [],
      professions: [],
    })
  },
  TEST_TIMEOUT_MS,
)
