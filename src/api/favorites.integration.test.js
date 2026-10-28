import { afterAll, expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  deleteSignedUpUser,
  SEEKER,
  signIn,
  signOut,
  signUp,
} from "../testing/index.js"
import { fetchMyFeedDefaults, saveFavoriteRegions } from "./events.js"

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
  "favorite regions are stored under one spelling and read back",
  async () => {
    const id = crypto.randomUUID()
    const email = `vitest-${id}@vaitu.local`
    userId = await signUp({ email, fullName: `Vitest ${id}` })

    await signIn({ email, password: SEEKER.password })
    const saved = await saveFavoriteRegions(["Toscana", "Tuscany", "Provence"])
    expect(saved).toEqual(["Tuscany", "Provence"])
    expect(await fetchMyFeedDefaults()).toEqual({
      favorite_regions: ["Tuscany", "Provence"],
      interested_categories: [],
    })
  },
  TEST_TIMEOUT_MS,
)

test(
  "a signed-out visitor cannot save favorite regions",
  async () => {
    await signOut()
    await expect(saveFavoriteRegions(["Tuscany"])).rejects.toThrow(
      "Not logged in",
    )
    expect(await fetchMyFeedDefaults()).toEqual({
      favorite_regions: [],
      interested_categories: [],
    })
  },
  TEST_TIMEOUT_MS,
)
