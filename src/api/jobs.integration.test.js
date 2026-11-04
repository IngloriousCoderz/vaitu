import { afterAll, describe, expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  ANTONY,
  coupleTitle,
  createJobAs,
  deleteOwnedJob,
  deleteOwnedJobByTitle,
  GIADA,
  jobPayload,
  signIn,
  signOut,
} from "../testing/index.js"
import { categories } from "../views/job-list/categories.js"
import { supabase } from "./client.js"
import {
  createJob,
  deleteJob,
  fetchJobForEdit,
  fetchMyJobs,
  fetchOpenJobRegions,
  fetchOpenJobsPage,
  updateJob,
} from "./jobs.js"

const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000
const CHECK_VIOLATION = "23514"

let jobId = null
let testUuid = null

afterAll(async () => {
  try {
    if (jobId) await deleteOwnedJob(jobId)
    else if (testUuid) {
      await deleteOwnedJobByTitle(jobPayload(testUuid).title)
    }
  } finally {
    await signOut()
  }
}, TEST_TIMEOUT_MS)

test(
  "a signed-in user can create a job",
  async () => {
    testUuid = crypto.randomUUID()
    await signIn(ANTONY)
    await createJob(jobPayload(testUuid))

    const mine = await fetchMyJobs()
    const created = mine.find((job) => job.title === coupleTitle(testUuid))
    expect(
      created,
      `job ${coupleTitle(testUuid)} not found among ${mine.length} jobs`,
    ).toBeTruthy()
    jobId = created.id
  },
  TEST_TIMEOUT_MS,
)

describe("deleting a job", () => {
  let ownedJobId = null
  let ownedUuid = null

  afterAll(async () => {
    try {
      if (ownedJobId) await deleteOwnedJob(ownedJobId)
      else if (ownedUuid) {
        await deleteOwnedJobByTitle(jobPayload(ownedUuid).title)
      }
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "another account cannot delete it",
    async () => {
      ownedUuid = crypto.randomUUID()
      ownedJobId = await createJobAs(ANTONY, ownedUuid)

      await signIn(GIADA)
      await expect(deleteJob(ownedJobId)).rejects.toThrow("Only the job owner")

      await signIn(ANTONY)
      const mine = await fetchMyJobs()
      expect(
        mine.some((job) => job.id === ownedJobId),
        "the other account deleted the job",
      ).toBe(true)
    },
    TEST_TIMEOUT_MS,
  )
})

describe("editing a job", () => {
  let ownedJobId = null
  let ownedUuid = null

  afterAll(async () => {
    try {
      if (ownedJobId) await deleteOwnedJob(ownedJobId)
      else if (ownedUuid) {
        await deleteOwnedJobByTitle(jobPayload(ownedUuid).title)
      }
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "another account cannot edit it",
    async () => {
      ownedUuid = crypto.randomUUID()
      const payload = jobPayload(ownedUuid)
      ownedJobId = await createJobAs(ANTONY, ownedUuid)

      await signIn(GIADA)
      await updateJob(ownedJobId, {
        ...payload,
        title: `Hijack ${ownedUuid}`,
      })

      await signIn(ANTONY)
      const row = await fetchJobForEdit(ownedJobId)
      expect(row.title).toBe(payload.title)
    },
    TEST_TIMEOUT_MS,
  )
})

describe("a job's category", () => {
  const insert = async (id, category) => {
    await signIn(ANTONY)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return supabase
      .from("jobs")
      .insert({ ...jobPayload(id), category, sender_id: user.id })
      .select("id")
      .single()
  }

  afterAll(signOut, TEST_TIMEOUT_MS)

  test(
    "can be any the app offers, and nothing else",
    async () => {
      for (const { id: category } of categories) {
        const { data, error } = await insert(crypto.randomUUID(), category)
        expect(error).toBeNull()
        await deleteOwnedJob(data.id)
      }

      const { error } = await insert(crypto.randomUUID(), "polka")
      expect(error?.code).toBe(CHECK_VIOLATION)
    },
    TEST_TIMEOUT_MS,
  )
})

describe("the feed", () => {
  let ownedJobId = null
  let ownedUuid = null

  afterAll(async () => {
    try {
      if (ownedJobId) await deleteOwnedJob(ownedJobId)
      else if (ownedUuid) {
        await deleteOwnedJobByTitle(jobPayload(ownedUuid).title)
      }
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "finds an open job by search, style and region, and offers its region to others only",
    async () => {
      ownedUuid = crypto.randomUUID()
      const region = `Vitest ${ownedUuid}`
      ownedJobId = await createJobAs(ANTONY, ownedUuid, undefined, {
        region,
      })
      await signIn(GIADA)

      const feed = {
        jobTypes: ["wedding_photographer"],
        details: [
          { key: "style", categories: ["wedding"], values: ["editorial"] },
        ],
        regions: [region],
        dateFrom: null,
        dateTo: null,
        search: `ada${ownedUuid}`.toLowerCase(),
        order: [["created_at", false]],
      }
      const page = await fetchOpenJobsPage(feed, { from: 0, to: 23 })
      expect(page.jobs.map((job) => job.id)).toEqual([ownedJobId])
      expect(page.total).toBe(1)

      const otherStyle = await fetchOpenJobsPage(
        { ...feed, details: [{ ...feed.details[0], values: ["classic"] }] },
        { from: 0, to: 23 },
      )
      expect(otherStyle.total).toBe(0)

      const otherTrade = await fetchOpenJobsPage(
        { ...feed, jobTypes: ["office_cleaner"] },
        { from: 0, to: 23 },
      )
      expect(otherTrade.total).toBe(0)

      expect(await fetchOpenJobRegions()).toContain(region)
      expect(await fetchOpenJobRegions(["wedding_photographer"])).toContain(
        region,
      )
      expect(await fetchOpenJobRegions(["office_cleaner"])).not.toContain(
        region,
      )

      await signIn(ANTONY)
      expect(await fetchOpenJobRegions()).not.toContain(region)
    },
    TEST_TIMEOUT_MS,
  )
})
