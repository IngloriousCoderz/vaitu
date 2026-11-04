import { afterAll, expect, test } from "vitest"

import {
  ANTONY,
  coupleTitle,
  createJobAs,
  deleteSignedUpUser,
  GIADA,
  jobPayload,
  PASSWORD,
  signIn,
  signOut,
  signUp,
} from "../testing/index.js"
import { updateApplicationStatus } from "./applications.js"
import { supabase } from "./client.js"
import { uploadJobImage } from "./images.js"
import { createJob, deleteJob, fetchJobDetail, fetchMyJobs } from "./jobs.js"

const TEST_TIMEOUT_MS = 60000

let userId = null
let senderJobId = null

afterAll(async () => {
  try {
    if (senderJobId) {
      await signIn(GIADA)
      await deleteJob(senderJobId)
    }
    if (userId) await deleteSignedUpUser(userId)
  } finally {
    await signOut()
  }
}, TEST_TIMEOUT_MS)

test(
  "a signed-out visitor cannot deactivate an account",
  async () => {
    await signOut()
    expect(await invoke("deactivate-account", {})).toEqual({
      status: 401,
      payload: { error: "Not logged in" },
    })
  },
  TEST_TIMEOUT_MS,
)

test(
  "the activity stamps are not the user's to write",
  async () => {
    await signIn(ANTONY)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false, last_login_at: null })
      .eq("id", user.id)
    expect(error?.message).toContain("permission denied")

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .single()
    expect(profile.is_active).toBe(true)
  },
  TEST_TIMEOUT_MS,
)

test(
  "deactivating deletes their open jobs and applications, but keeps the account and past wins",
  async () => {
    const id = crypto.randomUUID()
    const email = `vitest-${id}@vaitu.local`
    userId = await signUp({ email, fullName: `Vitest ${id}` })

    await signIn({ email, password: PASSWORD })
    await createJob(jobPayload(id))
    const created = (await fetchMyJobs()).find(
      (job) => job.title === coupleTitle(id),
    )
    expect(created).toBeTruthy()

    const assignedId = crypto.randomUUID()
    await createJob(jobPayload(assignedId))
    const assignedJob = (await fetchMyJobs()).find(
      (job) => job.title === coupleTitle(assignedId),
    )
    expect(assignedJob).toBeTruthy()

    const appliedId = crypto.randomUUID()
    senderJobId = await createJobAs(GIADA, appliedId)
    await signIn({ email, password: PASSWORD })

    await signIn(ANTONY)
    const {
      data: { user: applicant },
    } = await supabase.auth.getUser()
    const { error: applyError } = await supabase.from("applications").insert({
      job_id: assignedJob.id,
      applicant_id: applicant.id,
      motivation: "Available the whole day",
    })
    expect(applyError).toBeNull()
    const { data: sentApplication } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", assignedJob.id)
      .single()
    expect(sentApplication).toBeTruthy()

    await signIn({ email, password: PASSWORD })
    await updateApplicationStatus(sentApplication.id, "shortlisted")
    const { error: assignError } = await supabase.rpc("assign_winner", {
      p_job_id: assignedJob.id,
      p_application_id: sentApplication.id,
    })
    expect(assignError).toBeNull()
    const selectedJob = (await fetchMyJobs()).find(
      (job) => job.title === coupleTitle(assignedId),
    )
    expect(selectedJob?.status).toBe("assigned")

    await signIn(GIADA)
    const {
      data: { user: sender },
    } = await supabase.auth.getUser()
    await signIn({ email, password: PASSWORD })

    const result = await invoke("deactivate-account", { user_id: sender.id })
    expect(result).toEqual({ status: 200, payload: { deactivated: true } })

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active, deactivated_at")
      .eq("id", userId)
      .single()
    expect(profileError).toBeNull()
    expect(profile.is_active).toBe(false)
    expect(profile.deactivated_at).toBeTruthy()

    await signIn(ANTONY)
    const { data: orphaned, error: orphanedError } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", created.id)
    expect(orphanedError).toBeNull()
    expect(orphaned).toEqual([])

    const { data: kept } = await supabase
      .from("applications")
      .select("id, status, jobs(id)")
      .eq("job_id", assignedJob.id)
      .single()
    expect(kept?.status).toBe("selected")
    expect(kept?.jobs?.id).toBe(assignedJob.id)

    const detail = await fetchJobDetail(assignedJob.id)
    expect(detail.senderName).toBe(`Vitest ${id}`)

    await signOut()

    await signIn(GIADA)
    const { data: publicJob, error: jobError } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", created.id)
      .maybeSingle()
    expect(jobError).toBeNull()
    expect(publicJob).toBeNull()

    const { data: received, error: receivedError } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", senderJobId)
    expect(receivedError).toBeNull()
    expect(received).toEqual([])

    await signIn({ email, password: PASSWORD })
    const { data: isReactivated, error: touchError } =
      await supabase.rpc("touch_login")
    expect(touchError).toBeNull()
    expect(isReactivated).toBe(true)

    const { data: isReactivatedAgain } = await supabase.rpc("touch_login")
    expect(isReactivatedAgain).toBe(false)

    const { data: restored } = await supabase
      .from("profiles")
      .select("is_active, deactivated_at, last_login_at")
      .eq("id", userId)
      .single()
    expect(restored.is_active).toBe(true)
    expect(restored.deactivated_at).toBeNull()
    expect(restored.last_login_at).toBeTruthy()

    const { data: visibleAgain } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", created.id)
      .maybeSingle()
    expect(visibleAgain).toBeNull()

    const mine = (await fetchMyJobs()).find(
      (job) => job.title === coupleTitle(assignedId),
    )
    expect(mine?.status).toBe("assigned")

    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact" })
      .eq("applicant_id", userId)
    expect(count).toBe(0)

    await signIn(GIADA)
    await deleteJob(senderJobId)
    senderJobId = null

    await deleteSignedUpUser(userId)
    userId = null
  },
  TEST_TIMEOUT_MS,
)

test(
  "deactivating takes down the images of the jobs it deletes",
  async () => {
    const id = crypto.randomUUID()
    const email = `vitest-${id}@vaitu.local`
    const imageOwnerId = await signUp({ email, fullName: `Vitest ${id}` })
    try {
      await signIn({ email, password: PASSWORD })
      const image = await uploadJobImage(
        new File([new Uint8Array([1])], "venue.png", { type: "image/png" }),
      )
      await createJob({ ...jobPayload(id), image_urls: [image.url] })
      expect((await fetch(image.url)).ok).toBe(true)

      const result = await invoke("deactivate-account")
      expect(result.status).toBe(200)
      expect((await fetch(image.url)).ok).toBe(false)
    } finally {
      await deleteSignedUpUser(imageOwnerId)
    }
  },
  TEST_TIMEOUT_MS,
)

async function invoke(name, body) {
  const { data, response } = await supabase.functions.invoke(name, { body })
  const status = response?.status ?? 0
  const payload = status >= 400 && response ? await response.json() : data
  return { status, payload }
}
