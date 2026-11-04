import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, test } from "vitest"

import {
  ANTONY,
  createEventAs,
  deleteSignedUpUser,
  PASSWORD,
  setEventDate,
  signIn,
  signOut,
  signUp,
  updateAsService,
} from "../testing/index.js"
import {
  answerAgreement,
  answerSettlement,
  proposeAgreement,
} from "./agreements.js"
import { fetchApplicationDetail } from "./applications.js"
import { supabase } from "./client.js"
import { fetchEventDetail, fetchEventForEdit, updateEvent } from "./events.js"
import { fetchMyNotifications } from "./notifications.js"
import { fetchProfileStats, submitJobReview } from "./reputation.js"

const TEST_TIMEOUT_MS = 60000
const PAST_DATE = "2020-01-01"
const FUTURE_DATE = "2099-01-01"
const AGREED = 450
const CORRECTED = 500
const FIVE_STARS = 5
const LONG_AGO = "2020-01-01T00:00:00Z"
const OFFER = { kind: "fixed", amount_min: AGREED, currency: "EUR" }

async function account(label) {
  const id = crypto.randomUUID()
  const email = `vitest-${label}-${id}@vaitu.local`
  const userId = await signUp({ email, fullName: `Vitest ${label}` })
  return { userId, login: { email, password: PASSWORD } }
}

async function winJob(organizer, winner, { amount, eventDate = PAST_DATE }) {
  const eventId = await createEventAs(
    organizer.login,
    crypto.randomUUID(),
    undefined,
    { pay: OFFER },
  )
  await signIn(winner.login)
  const { data, error } = await supabase
    .from("applications")
    .insert({
      event_id: eventId,
      applicant_id: winner.userId,
      motivation: "Available",
    })
    .select("id")
    .single()
  if (error) throw error
  await signIn(organizer.login)
  await supabase
    .from("applications")
    .update({ status: "shortlisted" })
    .eq("id", data.id)
  const { error: assignError } = await supabase.rpc("assign_winner", {
    p_event_id: eventId,
    p_application_id: data.id,
    p_agreed_amount: amount,
  })
  if (assignError) throw assignError
  await setEventDate(eventId, eventDate)
  return { eventId, applicationId: data.id }
}

async function confirmedJob(organizer, winner) {
  const job = await winJob(organizer, winner, { amount: AGREED })
  await signIn(winner.login)
  await answerAgreement(job.applicationId, true)
  return job
}

describe("what a job pays", () => {
  let organizer
  let eventId

  beforeAll(async () => {
    organizer = await account("payer")
    eventId = await createEventAs(
      organizer.login,
      crypto.randomUUID(),
      undefined,
      { pay: OFFER },
    )
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    await deleteSignedUpUser(organizer.userId)
    await signOut()
  }, TEST_TIMEOUT_MS)

  test(
    "signed-in users see it, on the event and on the edit form",
    async () => {
      await signIn(ANTONY)
      const { event } = await fetchEventDetail(eventId)
      expect(event.pay).toMatchObject({ kind: "fixed", currency: "EUR" })
      expect(Number(event.pay.amount_min)).toBe(AGREED)

      await signIn(organizer.login)
      const row = await fetchEventForEdit(eventId)
      expect(row.event_pay.kind).toBe("fixed")
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "visitors never do, even though they can read the event",
    async () => {
      const visitor = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } },
      )
      const { data: event } = await visitor
        .from("events")
        .select("id")
        .eq("id", eventId)
      expect(event).toHaveLength(1)

      const { error } = await visitor.from("event_pay").select("kind")
      expect(error?.message).toContain("permission denied")
      const { error: embedError } = await visitor
        .from("events")
        .select("id, event_pay(kind)")
        .eq("id", eventId)
      expect(embedError).not.toBeNull()
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "only the sender can change it",
    async () => {
      await signIn(ANTONY)
      const { error } = await supabase
        .from("event_pay")
        .update({ amount_min: 1 })
        .eq("event_id", eventId)
      expect(error).toBeNull()
      const { event } = await fetchEventDetail(eventId)
      expect(Number(event.pay.amount_min)).toBe(AGREED)

      await signIn(organizer.login)
      const row = await fetchEventForEdit(eventId)
      await updateEvent(eventId, {
        ...row,
        pay: { kind: "to_agree" },
        details: row.details,
      })
      const edited = await fetchEventForEdit(eventId)
      expect(edited.event_pay.kind).toBe("to_agree")
      expect(edited.event_pay.amount_min).toBeNull()
    },
    TEST_TIMEOUT_MS,
  )
})

describe("what they agreed, and whether it was settled", () => {
  let organizer
  let winner
  let stranger

  beforeAll(async () => {
    organizer = await account("organizer")
    winner = await account("winner")
    stranger = await account("stranger")
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    await deleteSignedUpUser(organizer.userId)
    await deleteSignedUpUser(winner.userId)
    await deleteSignedUpUser(stranger.userId)
    await signOut()
  }, TEST_TIMEOUT_MS)

  async function statsOf(person) {
    await signIn(person.login)
    return (await fetchProfileStats([person.userId]))[person.userId]
  }

  test(
    "the winner confirms an amount, or sends it back to be corrected",
    async () => {
      const job = await winJob(organizer, winner, { amount: AGREED })

      await signIn(organizer.login)
      await expect(answerAgreement(job.applicationId, true)).rejects.toThrow(
        "Only the winner",
      )

      await signIn(winner.login)
      const proposed = await fetchApplicationDetail(job.applicationId)
      expect(proposed.agreement.status).toBe("proposed")
      expect(Number(proposed.agreement.amount)).toBe(AGREED)
      await answerAgreement(job.applicationId, false)

      await signIn(organizer.login)
      const notes = await fetchMyNotifications()
      expect(notes.some((n) => n.type === "agreement_rejected")).toBe(true)
      await proposeAgreement(job.applicationId, CORRECTED)

      await signIn(winner.login)
      await answerAgreement(job.applicationId, true)
      const confirmed = await fetchApplicationDetail(job.applicationId)
      expect(confirmed.agreement.status).toBe("confirmed")
      expect(Number(confirmed.agreement.amount)).toBe(CORRECTED)

      await signIn(organizer.login)
      await expect(proposeAgreement(job.applicationId, 1)).rejects.toThrow(
        "already confirmed",
      )
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "nobody else can propose, answer or read it",
    async () => {
      const job = await winJob(organizer, winner, { amount: AGREED })
      await signIn(stranger.login)
      await expect(proposeAgreement(job.applicationId, 1)).rejects.toThrow(
        "Only the event owner",
      )
      await expect(answerAgreement(job.applicationId, true)).rejects.toThrow(
        "Only the winner",
      )
      await expect(answerSettlement(job.applicationId, true)).rejects.toThrow(
        "Only the two sides",
      )
      const { data } = await supabase
        .from("job_agreements")
        .select("amount")
        .eq("application_id", job.applicationId)
      expect(data).toEqual([])
      const { error } = await supabase
        .from("job_agreements")
        .update({ status: "confirmed" })
        .eq("application_id", job.applicationId)
      expect(error?.message).toContain("permission denied")
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "settling waits for the date and a confirmed amount, once per side",
    async () => {
      const unconfirmed = await winJob(organizer, winner, { amount: AGREED })
      await signIn(winner.login)
      await expect(
        answerSettlement(unconfirmed.applicationId, true),
      ).rejects.toThrow("no confirmed agreement")

      const future = await winJob(organizer, winner, {
        amount: AGREED,
        eventDate: FUTURE_DATE,
      })
      await signIn(winner.login)
      await answerAgreement(future.applicationId, true)
      await expect(
        answerSettlement(future.applicationId, true),
      ).rejects.toThrow("date of the job")

      const job = await confirmedJob(organizer, winner)
      await answerSettlement(job.applicationId, true)
      await expect(answerSettlement(job.applicationId, true)).rejects.toThrow()
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "isn't asked of a job that did not take place",
    async () => {
      const job = await confirmedJob(organizer, winner)
      await signIn(organizer.login)
      await submitJobReview({
        application_id: job.applicationId,
        outcome: "cancelled",
      })
      await expect(answerSettlement(job.applicationId, true)).rejects.toThrow(
        "did not take place",
      )
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "a no notifies the other side, and counts only once they had time to reply",
    async () => {
      const accused = await account("accused")
      const job = await confirmedJob(accused, winner)
      await signIn(winner.login)
      await answerSettlement(job.applicationId, false)

      await signIn(accused.login)
      const notes = await fetchMyNotifications()
      expect(
        notes.some(
          (n) =>
            n.type === "settlement_contested" && n.event_id === job.eventId,
        ),
      ).toBe(true)
      expect((await statsOf(accused)).payment_issues).toBe(0)

      await updateAsService(
        "job_settlements",
        "application_id",
        job.applicationId,
        { answered_at: LONG_AGO },
      )
      expect((await statsOf(accused)).payment_issues).toBe(1)
      expect((await statsOf(winner)).payment_issues).toBe(0)
      await deleteSignedUpUser(accused.userId)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "a reply makes it a disagreement that counts against nobody",
    async () => {
      const accused = await account("accused")
      const job = await confirmedJob(accused, winner)
      await signIn(winner.login)
      await answerSettlement(job.applicationId, false)
      await signIn(accused.login)
      await answerSettlement(job.applicationId, true)
      await updateAsService(
        "job_settlements",
        "application_id",
        job.applicationId,
        { answered_at: LONG_AGO },
      )
      expect((await statsOf(accused)).payment_issues).toBe(0)
      await deleteSignedUpUser(accused.userId)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "repeated issues cost points and earn the badge, seen by anyone considering them",
    async () => {
      const accused = await account("accused")
      const earlier = await winJob(accused, winner, { amount: AGREED })
      await signIn(accused.login)
      await submitJobReview({
        application_id: earlier.applicationId,
        outcome: "completed",
        rating: FIVE_STARS,
      })
      for (let round = 0; round < 2; round++) {
        const job = await confirmedJob(accused, winner)
        await signIn(winner.login)
        await answerSettlement(job.applicationId, false)
        await updateAsService(
          "job_settlements",
          "application_id",
          job.applicationId,
          { answered_at: LONG_AGO },
        )
      }
      const open = await createEventAs(accused.login, crypto.randomUUID())
      expect(open).toBeTruthy()

      await signIn(stranger.login)
      const stats = (await fetchProfileStats([accused.userId]))[accused.userId]
      expect(stats.payment_issues).toBe(2)
      expect(stats.badges).toContain("payment_issues")
      await deleteSignedUpUser(accused.userId)
    },
    TEST_TIMEOUT_MS,
  )
})
