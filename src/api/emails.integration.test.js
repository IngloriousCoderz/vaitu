import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  ANTONY,
  createJobAs,
  deleteOwnedJob,
  GIADA,
  localServiceRoleKey,
  readAsService,
  runAsService,
  signIn,
  signOut,
  updateAsService,
} from "../testing/index.js"
import { supabase } from "./client.js"

const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000
const FUNCTIONS = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
const STATUS_NOT_FOUND = 404

function runSendEmails(key = localServiceRoleKey()) {
  return fetch(`${FUNCTIONS}/send-emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
  })
}

async function currentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user.id
}

async function notificationOf(jobId) {
  const rows = await readAsService("notifications", "job_id", jobId)
  return rows.find((row) => row.type === "application_received")
}

describe("notification emails", () => {
  let posterId = null
  const jobIds = []

  // Skipped emails count on the local stack too, and would use up the day's.
  beforeAll(() => updateAsService("email_budget", "day", today(), { sent: 0 }))

  afterAll(async () => {
    if (posterId) {
      await updateAsService("profiles", "id", posterId, {
        muted_email_types: [],
      })
    }
    for (const id of jobIds) await deleteOwnedJob(id)
    await signOut()
  }, TEST_TIMEOUT_MS)

  async function applied() {
    const jobId = await createJobAs(ANTONY, crypto.randomUUID())
    jobIds.push(jobId)
    posterId = await currentUserId()
    await signIn(GIADA)
    const { error } = await supabase.from("applications").insert({
      job_id: jobId,
      applicant_id: await currentUserId(),
      motivation: "Available",
    })
    expect(error).toBeNull()
    return jobId
  }

  test(
    "only the database can send them",
    async () => {
      const response = await runSendEmails(
        import.meta.env.VITE_SUPABASE_ANON_KEY,
      )
      expect(response.ok).toBe(false)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "a notification goes out once, or not at all when muted",
    async () => {
      const sent = await applied()
      expect((await notificationOf(sent)).emailed_at).toBeNull()
      expect((await runSendEmails()).ok).toBe(true)
      const first = (await notificationOf(sent)).emailed_at
      expect(first).toBeTruthy()
      await runSendEmails()
      expect((await notificationOf(sent)).emailed_at).toBe(first)

      await updateAsService("profiles", "id", posterId, {
        muted_email_types: ["application_received"],
      })
      const muted = await applied()
      await runSendEmails()
      expect((await notificationOf(muted)).emailed_at).toBeTruthy()
    },
    TEST_TIMEOUT_MS * 2,
  )

  test(
    "the link in an email turns that type off, signed out and without a key",
    async () => {
      const [{ token }] = await emailRecipient(posterId)
      await updateAsService("profiles", "id", posterId, {
        muted_email_types: [],
      })

      const stop = await fetch(
        `${FUNCTIONS}/email-unsubscribe?token=${token}&type=job_closed`,
        { method: "POST", body: "List-Unsubscribe=One-Click" },
      )
      expect(stop.ok).toBe(true)
      const { muted_email_types } = await profileOf(posterId)
      expect(muted_email_types).toEqual(["job_closed"])

      const forged = await fetch(
        `${FUNCTIONS}/email-unsubscribe?token=nope&type=job_closed`,
        { method: "POST" },
      )
      expect(forged.status).toBe(STATUS_NOT_FOUND)

      const scanner = await fetch(
        `${FUNCTIONS}/email-unsubscribe?token=${token}&type=all`,
      )
      expect(scanner.ok).toBe(false)
      expect((await profileOf(posterId)).muted_email_types).toEqual([
        "job_closed",
      ])
    },
    TEST_TIMEOUT_MS,
  )

  test("nobody else can read the tokens", async () => {
    await signIn(GIADA)
    const { data, error } = await supabase.from("email_tokens").select("token")
    expect(data ?? []).toEqual([])
    expect(error).not.toBeNull()
  })

  function emailRecipient(userId) {
    return runAsService("email_recipients", { p_user_ids: [userId] })
  }

  async function profileOf(userId) {
    const [profile] = await readAsService("profiles", "id", userId)
    return profile
  }
})

function today() {
  return new Date().toISOString().slice(0, 10)
}
