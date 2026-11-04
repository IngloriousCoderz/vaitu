import { afterAll, beforeAll, describe, expect, test } from "vitest"

import {
  ANTONY,
  createEventAs,
  deleteSignedUpUser,
  issueErasureLink,
  PASSWORD,
  readAsService,
  readEventAsService,
  runAsService,
  setEventDate,
  signIn,
  signOut,
  signUp,
  updateAsService,
  userExists,
} from "../testing/index.js"
import { supabase } from "./client.js"
import { fetchEventDetail } from "./events.js"
import { fetchMyNotifications } from "./notifications.js"
import { fetchProfileStats, submitJobReview } from "./reputation.js"
import {
  blockUser,
  fetchMyBlocks,
  reportContent,
  unblockUser,
} from "./safety.js"

const TEST_TIMEOUT_MS = 60000
const MOTIVATION = "Available the whole day"
const PAST_DATE = "2020-01-01"
const FUTURE_DATE = "2099-01-01"
const FIVE_STARS = 5
const REPORTS_LIMIT = 5
const VOICE_LIMIT = 3
const UNLIMITED_MINUTES = 1000000

async function account(label) {
  const id = crypto.randomUUID()
  const email = `vitest-${label}-${id}@vaitu.local`
  const userId = await signUp({ email, fullName: `Vitest ${label}` })
  return { userId, login: { email, password: PASSWORD } }
}

async function apply(eventId, applicant) {
  await signIn(applicant.login)
  const { data, error } = await supabase
    .from("applications")
    .insert({
      event_id: eventId,
      applicant_id: applicant.userId,
      motivation: MOTIVATION,
    })
    .select("id")
    .single()
  if (error) throw error
  return data.id
}

async function winJob(organizer, applicant, eventDate) {
  const eventId = await createEventAs(organizer.login, crypto.randomUUID())
  const applicationId = await apply(eventId, applicant)
  await signIn(organizer.login)
  await supabase
    .from("applications")
    .update({ status: "shortlisted" })
    .eq("id", applicationId)
  const { error } = await supabase.rpc("assign_winner", {
    p_event_id: eventId,
    p_application_id: applicationId,
  })
  if (error) throw error
  await setEventDate(eventId, eventDate)
  return { eventId, applicationId }
}

async function invoke(name, body) {
  const { data, response } = await supabase.functions.invoke(name, { body })
  const status = response?.status ?? 0
  const payload = status >= 400 && response ? await response.json() : data
  return { status, payload }
}

describe("erasing an account", () => {
  test(
    "keeps reviews and history anonymously, and wipes the person",
    async () => {
      const organizer = await account("organizer")
      const worker = await account("worker")
      const job = await winJob(organizer, worker, PAST_DATE)
      await signIn(organizer.login)
      await submitJobReview({
        application_id: job.applicationId,
        outcome: "completed",
        rating: FIVE_STARS,
        comment: "Punctual",
      })
      const upcoming = await winJob(organizer, worker, FUTURE_DATE)

      await signIn(worker.login)
      expect(await invoke("erase-account", {})).toEqual({
        status: 200,
        payload: { erased: true },
      })
      await signOut()
      expect(await userExists(worker.userId)).toBe(false)

      const [application] = await readAsService(
        "applications",
        "id",
        job.applicationId,
      )
      expect(application.applicant_id).toBeNull()
      expect(application.motivation).toBe("")
      const [review] = await readAsService(
        "job_reviews",
        "application_id",
        job.applicationId,
      )
      expect(review).toMatchObject({ rating: FIVE_STARS, comment: "Punctual" })

      await signIn(organizer.login)
      const notes = await fetchMyNotifications()
      expect(
        notes.some(
          (note) =>
            note.type === "application_withdrawn" &&
            note.event_id === upcoming.eventId,
        ),
      ).toBe(true)

      await deleteSignedUpUser(organizer.userId)
      await signOut()
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "as an organizer keeps the winner's record and tells the upcoming winner",
    async () => {
      const organizer = await account("organizer")
      const worker = await account("worker")
      const past = await winJob(organizer, worker, PAST_DATE)
      await signIn(organizer.login)
      await submitJobReview({
        application_id: past.applicationId,
        outcome: "completed",
        rating: FIVE_STARS,
        comment: "Great",
      })
      const upcoming = await winJob(organizer, worker, FUTURE_DATE)
      await signIn(organizer.login)
      expect((await invoke("erase-account", {})).status).toBe(200)
      await signOut()

      const event = await readEventAsService(past.eventId)
      expect(event).toMatchObject({ sender_id: null, title: "", details: {} })
      expect(event.deleted_at).toBeTruthy()

      await signIn(worker.login)
      const stats = (await fetchProfileStats([worker.userId]))[worker.userId]
      expect(stats.completed_count).toBe(1)
      expect(Number(stats.average_rating)).toBe(FIVE_STARS)
      const notes = await fetchMyNotifications()
      const cancelled = notes.find((note) => note.type === "job_cancelled")
      expect(cancelled?.event_title).toBeTruthy()
      await expect(fetchEventDetail(upcoming.eventId)).rejects.toThrow()

      await deleteSignedUpUser(worker.userId)
      await signOut()
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "works signed out with the emailed link, only once",
    async () => {
      const leaver = await account("leaver")
      const token = await issueErasureLink(leaver.userId)
      await signOut()
      expect(await invoke("erase-account", { token: "wrong" })).toEqual({
        status: 404,
        payload: { error: "link_expired" },
      })
      expect(await userExists(leaver.userId)).toBe(true)
      expect((await invoke("erase-account", { token })).status).toBe(200)
      expect(await userExists(leaver.userId)).toBe(false)
      expect((await invoke("erase-account", { token })).status).toBe(404)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "signing back in cancels the emailed link",
    async () => {
      const returner = await account("returner")
      await signIn(returner.login)
      expect((await invoke("deactivate-account", {})).status).toBe(200)
      const token = await issueErasureLink(returner.userId)
      await signIn(returner.login)
      const { data: isReactivated } = await supabase.rpc("touch_login")
      expect(isReactivated).toBe(true)
      await signOut()
      expect((await invoke("erase-account", { token })).status).toBe(404)
      await deleteSignedUpUser(returner.userId)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "signed out with no link is refused",
    async () => {
      await signOut()
      expect((await invoke("erase-account", {})).status).toBe(401)
    },
    TEST_TIMEOUT_MS,
  )
})

describe("blocking", () => {
  let one
  let other

  beforeAll(async () => {
    one = await account("one")
    other = await account("other")
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    await deleteSignedUpUser(one.userId)
    await deleteSignedUpUser(other.userId)
    await signOut()
  }, TEST_TIMEOUT_MS)

  test(
    "keeps both apart, withdraws without penalty, and can be undone",
    async () => {
      const eventId = await createEventAs(one.login, crypto.randomUUID())
      const applicationId = await apply(eventId, other)

      await signIn(one.login)
      await blockUser(other.userId)
      expect(await fetchMyBlocks()).toEqual([
        { blocked_id: other.userId, blocked_name: "Vitest other" },
      ])

      const [application] = await readAsService(
        "applications",
        "id",
        applicationId,
      )
      expect(application.status).toBe("withdrawn")
      expect(application.withdrawn_from).toBeNull()

      await signIn(other.login)
      const { data: seen } = await supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
      expect(seen).toEqual([])
      const { error: applyError } = await supabase.from("applications").insert({
        event_id: eventId,
        applicant_id: other.userId,
        motivation: MOTIVATION,
      })
      expect(applyError?.message).toContain("cannot apply")

      await signIn(one.login)
      await unblockUser(other.userId)
      expect(await fetchMyBlocks()).toEqual([])
      await signIn(other.login)
      const { data: seenAgain } = await supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
      expect(seenAgain).toHaveLength(1)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "cannot be used on yourself",
    async () => {
      await signIn(one.login)
      await expect(blockUser(one.userId)).rejects.toThrow("cannot block")
    },
    TEST_TIMEOUT_MS,
  )
})

describe("reporting", () => {
  test(
    "stores the report, limits it per day, and hides it from clients",
    async () => {
      const reporter = await account("reporter")
      const eventId = await createEventAs(ANTONY, crypto.randomUUID())
      await signIn(reporter.login)
      const report = {
        target_type: "event",
        target_id: eventId,
        reason: "spam",
        details: "Looks fake",
      }
      for (let sent = 0; sent < REPORTS_LIMIT; sent++) {
        expect(await reportContent(report)).toBe(true)
      }
      const refused = await invoke("report-content", report)
      expect(refused).toEqual({
        status: 429,
        payload: { error: "report_limit" },
      })

      const stored = await readAsService("reports", "event_id", eventId)
      expect(stored).toHaveLength(REPORTS_LIMIT)
      expect(stored[0]).toMatchObject({
        reporter_id: reporter.userId,
        reason: "spam",
        details: "Looks fake",
        status: "open",
      })

      const { error } = await supabase.from("reports").select("id")
      expect(error?.message).toContain("permission denied")

      expect(
        (await invoke("report-content", { ...report, reason: "polka" })).status,
      ).toBe(400)
      await deleteSignedUpUser(reporter.userId)
      await signOut()
    },
    TEST_TIMEOUT_MS,
  )
})

describe("the daily voice allowance", () => {
  test(
    "refuses before any provider is called, and only the service can claim",
    async () => {
      const talker = await account("talker")
      for (let used = 0; used < VOICE_LIMIT; used++) {
        expect(
          await runAsService("claim_voice_use", {
            p_user_id: talker.userId,
            p_kind: "parse",
          }),
        ).toBe(true)
        expect(
          await runAsService("claim_voice_use", {
            p_user_id: talker.userId,
            p_kind: "transcribe",
          }),
        ).toBe(true)
      }

      await signIn(talker.login)
      const limited = { status: 429, payload: { error: "voice_limit" } }
      expect(await invoke("parse-event", { transcript: "Ada e Leo" })).toEqual(
        limited,
      )
      expect(await invoke("transcribe-audio", new Blob(["clip"]))).toEqual(
        limited,
      )
      const { error } = await supabase.rpc("claim_voice_use", {
        p_user_id: talker.userId,
        p_kind: "parse",
      })
      expect(error?.message).toContain("permission denied")

      await runAsService("release_voice_use", {
        p_user_id: talker.userId,
        p_kind: "parse",
      })
      expect(
        await runAsService("claim_voice_use", {
          p_user_id: talker.userId,
          p_kind: "parse",
        }),
      ).toBe(true)

      await deleteSignedUpUser(talker.userId)
      await signOut()
    },
    TEST_TIMEOUT_MS,
  )
})

describe("the daily voice budget", () => {
  test(
    "pauses transcription for everyone once today's minutes are used",
    async () => {
      const talker = await account("budget")
      const [config] = await readAsService(
        "app_config",
        "key",
        "voice_daily_minutes",
      )
      const setMinutes = (value) =>
        updateAsService("app_config", "key", "voice_daily_minutes", { value })

      try {
        await setMinutes(0)
        expect(await runAsService("voice_budget_reached", {})).toBe(true)
        await signIn(talker.login)
        expect(await invoke("transcribe-audio", new Blob(["clip"]))).toEqual({
          status: 429,
          payload: { error: "voice_paused" },
        })
        expect(
          await readAsService("voice_usage", "user_id", talker.userId),
        ).toEqual([])

        await setMinutes(UNLIMITED_MINUTES)
        expect(await runAsService("voice_budget_reached", {})).toBe(false)
      } finally {
        await setMinutes(config.value)
      }

      await runAsService("record_voice_seconds", {
        p_user_id: talker.userId,
        p_seconds: 30,
      })
      await runAsService("record_voice_seconds", {
        p_user_id: talker.userId,
        p_seconds: 31.5,
      })
      const [usage] = await readAsService(
        "voice_usage",
        "user_id",
        talker.userId,
      )
      expect(usage).toMatchObject({
        kind: "transcribe",
        uses: 0,
        seconds: 61.5,
      })

      await deleteSignedUpUser(talker.userId)
      await signOut()
    },
    TEST_TIMEOUT_MS,
  )
})
