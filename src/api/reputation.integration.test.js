import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { defaultTiers, tiersFromConfig } from "../common/tiers.js"
import {
  ANTONY,
  createEventAs,
  deleteSignedUpUser,
  PASSWORD,
  readEventAsService,
  runAsService,
  setEventDate,
  signIn,
  signOut,
  signUp,
} from "../testing/index.js"
import { fetchMyApplications, withdrawApplication } from "./applications.js"
import { supabase } from "./client.js"
import { deleteEvent, fetchEventDetail } from "./events.js"
import { fetchMyNotifications } from "./notifications.js"
import {
  fetchProfileReviews,
  fetchProfileStats,
  submitJobReview,
} from "./reputation.js"

const TEST_TIMEOUT_MS = 60000
const MOTIVATION = "Available the whole day"
const PAST_DATE = "2020-01-01"
const FIVE_STARS = 5
const ONE_STAR = 1
const COMPLETED_JOB_WITH_FIVE_STARS_POINTS = 25
const NO_SHOW_FLOORED_POINTS = 0

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

async function winJob(organizer, applicant, { eventDate = PAST_DATE } = {}) {
  const eventId = await createEventAs(organizer.login, crypto.randomUUID())
  const applicationId = await apply(eventId, applicant)
  await signIn(organizer.login)
  const { error: shortlistError } = await supabase
    .from("applications")
    .update({ status: "shortlisted" })
    .eq("id", applicationId)
  if (shortlistError) throw shortlistError
  const { error: assignError } = await supabase.rpc("assign_winner", {
    p_event_id: eventId,
    p_application_id: applicationId,
  })
  if (assignError) throw assignError
  await setEventDate(eventId, eventDate)
  return { eventId, applicationId }
}

describe("claim_alert", () => {
  test("gives out one alert a day, and none to the client", async () => {
    const key = `vitest-${crypto.randomUUID()}`
    expect(await runAsService("claim_alert", { p_key: key })).toBe(true)
    expect(await runAsService("claim_alert", { p_key: key })).toBe(false)

    await signIn(ANTONY)
    const { error } = await supabase.rpc("claim_alert", { p_key: key })
    expect(error?.message).toContain("permission denied")
    const { error: readError } = await supabase.from("alert_log").select("key")
    expect(readError?.message).toContain("permission denied")
  })
})

describe("app_config", () => {
  test("the fallbacks match what the database holds", async () => {
    const { data, error } = await supabase
      .from("app_config")
      .select("key, value")
    expect(error).toBeNull()
    expect(tiersFromConfig(data)).toEqual(defaultTiers())
  })
})

describe("reputation", () => {
  let organizer
  let worker
  let stranger

  beforeAll(async () => {
    organizer = await account("organizer")
    worker = await account("worker")
    stranger = await account("stranger")
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    await deleteSignedUpUser(organizer.userId)
    await deleteSignedUpUser(worker.userId)
    await deleteSignedUpUser(stranger.userId)
    await signOut()
  }, TEST_TIMEOUT_MS)

  async function statsOfWorker() {
    await signIn(worker.login)
    return (await fetchProfileStats([worker.userId]))[worker.userId]
  }

  test(
    "applying alone earns nothing",
    async () => {
      const eventId = await createEventAs(organizer.login, crypto.randomUUID())
      await apply(eventId, worker)
      const stats = await statsOfWorker()
      expect(stats.points).toBe(0)
      expect(stats.applications_count).toBe(1)
      expect(stats.tier).toBeNull()
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "only the organizer reviews, and only once the date has come",
    async () => {
      const future = await winJob(organizer, worker, {
        eventDate: "2099-01-01",
      })
      const review = {
        application_id: future.applicationId,
        outcome: "completed",
        rating: FIVE_STARS,
        comment: "Great",
      }

      await signIn(organizer.login)
      await expect(submitJobReview(review)).rejects.toThrow("date has come")

      await setEventDate(future.eventId, PAST_DATE)
      await signIn(worker.login)
      await expect(submitJobReview(review)).rejects.toThrow(
        "Only the event owner",
      )

      await signIn(organizer.login)
      expect(await submitJobReview(review)).toBe(true)
      await expect(submitJobReview(review)).rejects.toThrow()

      const stats = await statsOfWorker()
      expect(stats.points).toBe(COMPLETED_JOB_WITH_FIVE_STARS_POINTS)
      expect(stats.tier).toBe("bronze")
      expect(Number(stats.average_rating)).toBe(FIVE_STARS)

      const notes = await fetchMyNotifications()
      expect(
        notes.some(
          (note) =>
            note.type === "job_reviewed" && note.event_id === future.eventId,
        ),
      ).toBe(true)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "a reviewed job cannot be withdrawn from, and its review survives deletion",
    async () => {
      const job = await winJob(organizer, worker)
      await signIn(organizer.login)
      await submitJobReview({
        application_id: job.applicationId,
        outcome: "completed",
        rating: FIVE_STARS,
        comment: null,
      })

      await signIn(worker.login)
      await expect(withdrawApplication(job.applicationId)).rejects.toThrow(
        "already been reviewed",
      )
      const before = await statsOfWorker()

      await signIn(organizer.login)
      await deleteEvent(job.eventId)
      await expect(fetchEventDetail(job.eventId)).rejects.toThrow()

      const after = await statsOfWorker()
      expect(after.points).toBe(before.points)
      expect(after.completed_count).toBe(before.completed_count)
      expect(after.selections_count).toBe(before.selections_count - 1)

      const shown = await fetchMyApplications()
      expect(shown.some((row) => row.id === job.eventId)).toBe(false)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "deleting wipes what the event says",
    async () => {
      const job = await winJob(organizer, worker)
      await signIn(organizer.login)
      await deleteEvent(job.eventId)

      const row = await readEventAsService(job.eventId)
      expect(row.deleted_at).toBeTruthy()
      expect(row).toMatchObject({
        title: "",
        location: "",
        details: {},
        image_urls: [],
      })

      await signIn(worker.login)
      const { data } = await supabase
        .from("events")
        .select("id")
        .eq("id", job.eventId)
      expect(data).toEqual([])
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "an event nobody applied to is simply gone",
    async () => {
      const eventId = await createEventAs(organizer.login, crypto.randomUUID())
      await deleteEvent(eventId)
      expect(await readEventAsService(eventId)).toBeNull()
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "another account cannot read someone's stats or reviews",
    async () => {
      await signIn(stranger.login)
      expect(await fetchProfileStats([worker.userId])).toEqual({})
      expect(await fetchProfileReviews([worker.userId])).toEqual({})
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "an organizer reads the whole record of someone applying to them",
    async () => {
      const eventId = await createEventAs(stranger.login, crypto.randomUUID())
      await apply(eventId, worker)
      await signIn(stranger.login)
      const stats = (await fetchProfileStats([worker.userId]))[worker.userId]
      expect(stats.completed_count).toBeGreaterThan(0)
      const reviews = await fetchProfileReviews([worker.userId])
      expect(reviews[worker.userId]).toEqual(
        expect.arrayContaining([expect.objectContaining({ comment: "Great" })]),
      )
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "reporting a no-show needs no rating and costs points, never below zero",
    async () => {
      const flaky = await account("flaky")
      const job = await winJob(organizer, flaky)
      await signIn(organizer.login)
      await submitJobReview({
        application_id: job.applicationId,
        outcome: "no_show",
        rating: null,
        comment: null,
      })
      await signIn(flaky.login)
      const stats = (await fetchProfileStats([flaky.userId]))[flaky.userId]
      expect(stats.points).toBe(NO_SHOW_FLOORED_POINTS)
      await deleteSignedUpUser(flaky.userId)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "a bad rating cannot be stored",
    async () => {
      const job = await winJob(organizer, worker)
      await signIn(organizer.login)
      await expect(
        submitJobReview({
          application_id: job.applicationId,
          outcome: "completed",
          rating: FIVE_STARS + ONE_STAR,
          comment: null,
        }),
      ).rejects.toThrow()
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "dropping a won job counts, and repeated failures earn the Unreliable badge",
    async () => {
      const dropper = await account("dropper")
      for (let round = 0; round < 2; round++) {
        const job = await winJob(organizer, dropper, {
          eventDate: "2099-01-01",
        })
        await signIn(dropper.login)
        await withdrawApplication(job.applicationId)
      }
      const stats = (await fetchProfileStats([dropper.userId]))[dropper.userId]
      expect(stats.badges).toContain("unreliable")
      expect(stats.points).toBe(0)
      await deleteSignedUpUser(dropper.userId)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "the Serial Withdrawer badge needs both a count and a share",
    async () => {
      const quitter = await account("quitter")
      for (let round = 0; round < 3; round++) {
        const eventId = await createEventAs(
          organizer.login,
          crypto.randomUUID(),
        )
        const id = await apply(eventId, quitter)
        await withdrawApplication(id)
      }
      const stats = (await fetchProfileStats([quitter.userId]))[quitter.userId]
      expect(stats.badges).toContain("serial_withdrawer")
      expect(stats.applications_count).toBe(0)
      await deleteSignedUpUser(quitter.userId)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "a past job with no review asks the organizer once",
    async () => {
      const job = await winJob(organizer, worker)
      await runAsService("request_job_outcomes")
      await runAsService("request_job_outcomes")
      await signIn(organizer.login)
      const asked = (await fetchMyNotifications()).filter(
        (note) =>
          note.type === "job_outcome_due" && note.event_id === job.eventId,
      )
      expect(asked).toHaveLength(1)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "a matching new event alerts who asked for it, and nobody else",
    async () => {
      const fan = await account("fan")
      const muted = await account("muted")
      const elsewhere = await account("elsewhere")
      const preferences = [
        [fan, { professions: ["photographer"], favorite_regions: ["Tuscany"] }],
        [
          muted,
          {
            professions: ["photographer"],
            muted_email_types: ["new_event"],
            muted_push_types: ["all"],
          },
        ],
        [
          elsewhere,
          { professions: ["photographer"], favorite_regions: ["Sicily"] },
        ],
      ]
      for (const [person, fields] of preferences) {
        await signIn(person.login)
        const { error } = await supabase
          .from("profiles")
          .update(fields)
          .eq("id", person.userId)
        expect(error).toBeNull()
      }

      const eventId = await createEventAs(organizer.login, crypto.randomUUID())

      async function isAlerted(person) {
        await signIn(person.login)
        const notes = await fetchMyNotifications()
        return notes.some(
          (note) => note.type === "new_event" && note.event_id === eventId,
        )
      }
      expect(await isAlerted(fan)).toBe(true)
      expect(await isAlerted(muted)).toBe(false)
      expect(await isAlerted(elsewhere)).toBe(false)
      expect(await isAlerted(worker)).toBe(false)

      await deleteSignedUpUser(fan.userId)
      await deleteSignedUpUser(muted.userId)
      await deleteSignedUpUser(elsewhere.userId)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "users cannot flip their own record",
    async () => {
      await signIn(organizer.login)
      const eventId = await createEventAs(organizer.login, crypto.randomUUID())
      const { error: undelete } = await supabase
        .from("events")
        .update({ deleted_at: null })
        .eq("id", eventId)
      expect(undelete?.message).toContain("permission denied")

      const { error: hardDelete } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)
      expect(hardDelete?.message).toContain("permission denied")

      const { error: forged } = await supabase.from("job_reviews").insert({
        application_id: crypto.randomUUID(),
        outcome: "completed",
        rating: FIVE_STARS,
      })
      expect(forged?.message).toContain("permission denied")
    },
    TEST_TIMEOUT_MS,
  )
})
