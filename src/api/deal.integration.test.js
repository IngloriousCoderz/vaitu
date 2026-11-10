import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, test } from "vitest"

import {
  ANTONY,
  createJobAs,
  deleteSignedUpUser,
  PASSWORD,
  setJobDate,
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
import { fetchJobDetail, fetchJobForEdit, updateJob } from "./jobs.js"
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

async function winJob(
  poster,
  winner,
  { amount, jobDate = PAST_DATE, pay = OFFER },
) {
  const jobId = await createJobAs(
    poster.login,
    crypto.randomUUID(),
    undefined,
    { pay },
  )
  await signIn(winner.login)
  const { data, error } = await supabase
    .from("applications")
    .insert({
      job_id: jobId,
      applicant_id: winner.userId,
      motivation: "Available",
    })
    .select("id")
    .single()
  if (error) throw error
  await signIn(poster.login)
  await supabase
    .from("applications")
    .update({ status: "shortlisted" })
    .eq("id", data.id)
  const { error: assignError } = await supabase.rpc("assign_winner", {
    p_job_id: jobId,
    p_application_id: data.id,
    p_agreed_amount: amount,
  })
  if (assignError) throw assignError
  await setJobDate(jobId, jobDate)
  return { jobId, applicationId: data.id }
}

async function confirmedJob(poster, winner) {
  const job = await winJob(poster, winner, { amount: AGREED })
  await signIn(winner.login)
  await answerAgreement(job.applicationId, true)
  return job
}

describe("what a job pays", () => {
  let poster
  let jobId

  beforeAll(async () => {
    poster = await account("payer")
    jobId = await createJobAs(poster.login, crypto.randomUUID(), undefined, {
      pay: OFFER,
    })
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    await deleteSignedUpUser(poster.userId)
    await signOut()
  }, TEST_TIMEOUT_MS)

  test(
    "signed-in users see it, on the job and on the edit form",
    async () => {
      await signIn(ANTONY)
      const { job } = await fetchJobDetail(jobId)
      expect(job.pay).toMatchObject({ kind: "fixed", currency: "EUR" })
      expect(Number(job.pay.amount_min)).toBe(AGREED)

      await signIn(poster.login)
      const row = await fetchJobForEdit(jobId)
      expect(row.job_pay.kind).toBe("fixed")
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "visitors never do, even though they can read the job",
    async () => {
      const visitor = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } },
      )
      const { data: job } = await visitor
        .from("jobs")
        .select("id")
        .eq("id", jobId)
      expect(job).toHaveLength(1)

      const { error } = await visitor.from("job_pay").select("kind")
      expect(error?.message).toContain("permission denied")
      const { error: embedError } = await visitor
        .from("jobs")
        .select("id, job_pay(kind)")
        .eq("id", jobId)
      expect(embedError).not.toBeNull()
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "only the poster can change it",
    async () => {
      await signIn(ANTONY)
      const { error } = await supabase
        .from("job_pay")
        .update({ amount_min: 1 })
        .eq("job_id", jobId)
      expect(error).toBeNull()
      const { job } = await fetchJobDetail(jobId)
      expect(Number(job.pay.amount_min)).toBe(AGREED)

      await signIn(poster.login)
      const row = await fetchJobForEdit(jobId)
      await updateJob(jobId, {
        ...row,
        pay: { kind: "to_agree" },
        details: row.details,
      })
      const edited = await fetchJobForEdit(jobId)
      expect(edited.job_pay.kind).toBe("to_agree")
      expect(edited.job_pay.amount_min).toBeNull()
    },
    TEST_TIMEOUT_MS,
  )
})

describe("what they agreed, and whether it was settled", () => {
  let poster
  let winner
  let stranger

  beforeAll(async () => {
    poster = await account("poster")
    winner = await account("winner")
    stranger = await account("stranger")
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    await deleteSignedUpUser(poster.userId)
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
      const job = await winJob(poster, winner, { amount: AGREED })

      await signIn(poster.login)
      await expect(answerAgreement(job.applicationId, true)).rejects.toThrow(
        "Only the winner",
      )

      await signIn(winner.login)
      const proposed = await fetchApplicationDetail(job.applicationId)
      expect(proposed.agreement.status).toBe("proposed")
      expect(Number(proposed.agreement.amount)).toBe(AGREED)
      await answerAgreement(job.applicationId, false)

      await signIn(poster.login)
      const notes = await fetchMyNotifications()
      expect(notes.some((n) => n.type === "agreement_rejected")).toBe(true)
      await proposeAgreement(job.applicationId, CORRECTED)

      await signIn(winner.login)
      await answerAgreement(job.applicationId, true)
      const confirmed = await fetchApplicationDetail(job.applicationId)
      expect(confirmed.agreement.status).toBe("confirmed")
      expect(Number(confirmed.agreement.amount)).toBe(CORRECTED)

      await signIn(poster.login)
      await expect(proposeAgreement(job.applicationId, 1)).rejects.toThrow(
        "already confirmed",
      )
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "an agreed amount is above zero, and an unpaid job has none",
    async () => {
      const paid = await winJob(poster, winner, { amount: null })
      await signIn(poster.login)
      await expect(proposeAgreement(paid.applicationId, 0)).rejects.toThrow(
        "more than zero",
      )

      const unpaid = await winJob(poster, winner, {
        amount: null,
        pay: { kind: "unpaid", currency: "EUR" },
      })
      await signIn(poster.login)
      await expect(
        proposeAgreement(unpaid.applicationId, AGREED),
      ).rejects.toThrow("unpaid")
      const { error } = await supabase
        .from("job_pay")
        .update({ kind: "fixed", amount_min: 0 })
        .eq("job_id", unpaid.jobId)
      expect(error?.message).toContain("check constraint")
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "nobody else can propose, answer or read it",
    async () => {
      const job = await winJob(poster, winner, { amount: AGREED })
      await signIn(stranger.login)
      await expect(proposeAgreement(job.applicationId, 1)).rejects.toThrow(
        "Only the poster",
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
      const unconfirmed = await winJob(poster, winner, { amount: AGREED })
      await signIn(winner.login)
      await expect(
        answerSettlement(unconfirmed.applicationId, true),
      ).rejects.toThrow("no confirmed agreement")

      const future = await winJob(poster, winner, {
        amount: AGREED,
        jobDate: FUTURE_DATE,
      })
      await signIn(winner.login)
      await answerAgreement(future.applicationId, true)
      await expect(
        answerSettlement(future.applicationId, true),
      ).rejects.toThrow("date of the job")

      const job = await confirmedJob(poster, winner)
      await answerSettlement(job.applicationId, true)
      await expect(answerSettlement(job.applicationId, true)).rejects.toThrow()
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "isn't asked of a job that did not take place",
    async () => {
      const job = await confirmedJob(poster, winner)
      await signIn(poster.login)
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
          (n) => n.type === "settlement_contested" && n.job_id === job.jobId,
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
      const open = await createJobAs(accused.login, crypto.randomUUID())
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
