import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { DAY_MS } from "../constants/index.js"
import {
  deleteSignedUpUser,
  insertAsService,
  readAsService,
  runAsService,
  signOut,
  signUp,
} from "../testing/index.js"

const TEST_TIMEOUT_MS = 30000

describe("purging old rows", () => {
  let userId

  beforeAll(async () => {
    const id = crypto.randomUUID()
    userId = await signUp({
      email: `vitest-purge-${id}@vaitu.local`,
      fullName: "Vitest purge",
    })
    await signOut()
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    await deleteSignedUpUser(userId)
  }, TEST_TIMEOUT_MS)

  test(
    "drops read notifications after 30 days and any after 90",
    async () => {
      await insertAsService("notifications", [
        notification("read-recent", { daysAgo: 10, isRead: true }),
        notification("read-old", { daysAgo: 31, isRead: true }),
        notification("unread-recent", { daysAgo: 60, isRead: false }),
        notification("unread-old", { daysAgo: 91, isRead: false }),
      ])

      await runAsService("purge_old_rows")

      const left = await readAsService("notifications", "user_id", userId)
      expect(left.map((row) => row.applicant_name).sort()).toEqual([
        "read-recent",
        "unread-recent",
      ])
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "drops expired erasure links",
    async () => {
      await insertAsService("account_erasures", [
        erasure("live", { daysFromNow: 1 }),
        erasure("expired", { daysFromNow: -1 }),
      ])

      await runAsService("purge_old_rows")

      const left = await readAsService("account_erasures", "user_id", userId)
      expect(left.map((row) => row.token_hash)).toEqual([`${userId}-live`])
    },
    TEST_TIMEOUT_MS,
  )

  function notification(name, { daysAgo, isRead }) {
    return {
      user_id: userId,
      type: "new_job",
      applicant_name: name,
      is_read: isRead,
      created_at: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
    }
  }

  function erasure(name, { daysFromNow }) {
    return {
      token_hash: `${userId}-${name}`,
      user_id: userId,
      expires_at: new Date(Date.now() + daysFromNow * DAY_MS).toISOString(),
    }
  }
})
