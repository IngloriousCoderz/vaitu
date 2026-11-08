import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  ANTONY,
  createJobAs,
  deleteOwnedJob,
  deleteSignedUpUser,
  GIADA,
  PASSWORD,
  pastDeadline,
  signIn,
  signOut,
  signUp,
  updateAsService,
} from "../testing/index.js"
import { feedQuery, localToday } from "../views/job-list/query.js"
import {
  fetchApplicants,
  fetchMyApplicationMap,
  fetchReceivedDetail,
  updateMotivation,
  withdrawApplication,
} from "./applications.js"
import { supabase } from "./client.js"
import { fetchFeedRegions, fetchJobDetail, fetchOpenJobsPage } from "./jobs.js"

const MOTIVATION = "Available the whole day"
const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000
const SHORTLIST_CAP = 1

describe("applying and choosing a winner", () => {
  let jobId = null

  beforeAll(async () => {
    jobId = await createJobAs(ANTONY, crypto.randomUUID())
  })

  afterAll(async () => {
    if (jobId) await deleteOwnedJob(jobId)
    await signOut()
  })

  test("the owner cannot apply to their own job", async () => {
    await signIn(ANTONY)
    const { error } = await apply(jobId, MOTIVATION)
    expect(error.message).toContain("You cannot apply to your own job")
  })

  test("someone else can apply to that job", async () => {
    await signIn(GIADA)
    const { error } = await apply(jobId, MOTIVATION)
    expect(error).toBeNull()
  })

  test("the owner can see that application", async () => {
    await signIn(ANTONY)
    const { data, error } = await supabase
      .from("applications")
      .select("id, motivation")
      .eq("job_id", jobId)
    expect(error).toBeNull()
    expect(data).toEqual([{ id: expect.any(String), motivation: MOTIVATION }])
    const applicants = await fetchApplicants([data[0].id])
    expect(applicants[data[0].id].full_name).toBe("Giada Cazzola")
  })

  test("a pending application cannot win", async () => {
    await signIn(ANTONY)
    const { error } = await assignWinner(jobId, await applicationId(jobId))
    expect(error.message).toContain("Winner must come from the shortlist")
  })

  test("the owner shortlists the application", async () => {
    await signIn(ANTONY)
    const id = await applicationId(jobId)
    const { error } = await supabase
      .from("applications")
      .update({ status: "shortlisted" })
      .eq("id", id)
    expect(error).toBeNull()

    const { data, error: readError } = await supabase
      .from("applications")
      .select("status")
      .eq("id", id)
      .single()
    expect(readError).toBeNull()
    expect(data.status).toBe("shortlisted")
  })

  test("the applicant cannot assign the winner", async () => {
    await signIn(GIADA)
    const { error } = await assignWinner(jobId, await applicationId(jobId))
    expect(error.message).toContain("Only the poster can assign a winner")
  })

  test("the owner assigns the winner", async () => {
    await signIn(ANTONY)
    const id = await applicationId(jobId)
    const { error } = await assignWinner(jobId, id)
    expect(error).toBeNull()

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("status")
      .eq("id", id)
      .single()
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("status")
      .eq("id", jobId)
      .single()
    expect(applicationError).toBeNull()
    expect(jobError).toBeNull()
    expect(application.status).toBe("selected")
    expect(job.status).toBe("assigned")
  })

  test("the winner sees the job is theirs", async () => {
    await signIn(GIADA)
    const { job } = await fetchJobDetail(jobId)
    expect(job.status).toBe("assigned")
    expect(job.applicationStatus).toBe("selected")
  })

  test("the winner still finds the job in the feed", async () => {
    await signIn(GIADA)
    const { appliedMap, wonJobIds } = await fetchMyApplicationMap(localToday())
    expect(wonJobIds).toContain(jobId)
    const jobs = async (status) => {
      const feed = feedQuery({
        query: "",
        types: [],
        details: [],
        interests: [],
        activeProfessions: [],
        myProfessions: [],
        region: null,
        period: "all",
        favoriteRegions: [],
        regions: [],
        sort: "created_desc",
        today: localToday(),
        status,
        appliedJobIds: Object.keys(appliedMap),
        wonJobIds,
      })
      const page = await fetchOpenJobsPage(feed, { from: 0, to: 199 })
      return page.jobs
    }
    const all = await jobs("all")
    expect(all.find((job) => job.id === jobId)?.status).toBe("assigned")
    expect(
      await fetchFeedRegions([], { wonJobIds, today: localToday() }),
    ).toContain(all.find((job) => job.id === jobId).region)
    const ids = async (status) => (await jobs(status)).map((job) => job.id)
    expect(await ids("won")).toContain(jobId)
    expect(await ids("open")).not.toContain(jobId)
    expect(await ids("applied")).not.toContain(jobId)
  })

  test("the winner withdrawing reopens the job", async () => {
    await signIn(GIADA)
    const id = await applicationId(jobId)
    await withdrawApplication(id)

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("status, withdrawn_from")
      .eq("id", id)
      .single()
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("status")
      .eq("id", jobId)
      .single()
    expect(applicationError).toBeNull()
    expect(jobError).toBeNull()
    expect(application).toEqual({
      status: "withdrawn",
      withdrawn_from: "selected",
    })
    expect(job.status).toBe("open")
  })
})

describe("a passed deadline", () => {
  const jobIds = []

  afterAll(async () => {
    for (const id of jobIds) await deleteOwnedJob(id)
    await signOut()
  })

  test("a new application is refused", async () => {
    const jobId = await createJobAs(ANTONY, crypto.randomUUID(), pastDeadline())
    jobIds.push(jobId)
    await signIn(GIADA)
    const { error } = await apply(jobId, MOTIVATION)
    expect(error.message).toContain("Application deadline has passed")
  })

  test("the winner withdrawing after the deadline leaves the job assigned", async () => {
    const jobId = await createJobAs(ANTONY, crypto.randomUUID())
    jobIds.push(jobId)
    await signIn(GIADA)
    expect((await apply(jobId, MOTIVATION)).error).toBeNull()
    await signIn(ANTONY)
    const id = await shortlist(jobId)
    expect((await assignWinner(jobId, id)).error).toBeNull()

    const { error: deadlineError } = await supabase
      .from("jobs")
      .update({ application_deadline: pastDeadline() })
      .eq("id", jobId)
    expect(deadlineError).toBeNull()

    await signIn(GIADA)
    await withdrawApplication(id)
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("status")
      .eq("id", jobId)
      .single()
    expect(jobError).toBeNull()
    expect(job.status).toBe("assigned")
  })
})

describe("the shortlist after the winner withdraws", () => {
  let jobId = null
  let userId = null
  let winnerUserId = null
  let otherId = null

  beforeAll(async () => {
    const id = crypto.randomUUID()
    const email = `vitest-${id}@vaitu.local`
    userId = await signUp({ email, fullName: `Vitest ${id}` })
    jobId = await createJobAs(ANTONY, crypto.randomUUID())

    await signIn({ email, password: PASSWORD })
    expect((await apply(jobId, MOTIVATION)).error).toBeNull()
    await signIn(GIADA)
    winnerUserId = (await supabase.auth.getUser()).data.user.id
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    if (jobId) await deleteOwnedJob(jobId)
    if (userId) await deleteSignedUpUser(userId)
    await signOut()
  }, TEST_TIMEOUT_MS)

  async function assignPoster({ shortlistOther = true } = {}) {
    await signIn(GIADA)
    expect((await apply(jobId, MOTIVATION)).error).toBeNull()

    await signIn(ANTONY)
    const winnerId = await applicationIdFor(jobId, winnerUserId)
    otherId = await applicationIdFor(jobId, userId)
    await setStatus(winnerId, "shortlisted")
    if (shortlistOther) await setStatus(otherId, "shortlisted")
    expect((await assignWinner(jobId, winnerId)).error).toBeNull()
    expect(await statusOf(otherId)).toBe("rejected")
    return winnerId
  }

  test(
    "comes back as it was before the assignment",
    async () => {
      const winnerId = await assignPoster()

      await signIn(GIADA)
      await withdrawApplication(winnerId)

      await signIn(ANTONY)
      expect(await statusOf(otherId)).toBe("shortlisted")
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "keeps a rejection the poster made after the assignment",
    async () => {
      const winnerId = await assignPoster({ shortlistOther: false })
      await setStatus(otherId, "pending")
      await setStatus(otherId, "rejected")

      await signIn(GIADA)
      await withdrawApplication(winnerId)

      await signIn(ANTONY)
      expect(await statusOf(otherId)).toBe("rejected")
    },
    TEST_TIMEOUT_MS,
  )
})

describe("withdrawing an application", () => {
  let jobId = null

  beforeAll(async () => {
    jobId = await createJobAs(ANTONY, crypto.randomUUID())
  })

  afterAll(async () => {
    if (jobId) await deleteOwnedJob(jobId)
    await signOut()
  })

  test("a pending application can be withdrawn", async () => {
    await signIn(GIADA)
    expect((await apply(jobId, MOTIVATION)).error).toBeNull()
    await withdrawApplication(await applicationId(jobId))

    const { data, error } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .neq("status", "withdrawn")
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  test("a withdrawn application cannot come back or be withdrawn twice", async () => {
    await signIn(GIADA)
    const { data: withdrawn } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("status", "withdrawn")
      .limit(1)
      .single()

    await expect(withdrawApplication(withdrawn.id)).rejects.toThrow()

    await signIn(ANTONY)
    const { error } = await supabase
      .from("applications")
      .update({ status: "shortlisted" })
      .eq("id", withdrawn.id)
    expect(error?.message).toContain("cannot change this application status")
  })

  test("applications cannot be deleted from the client", async () => {
    await signIn(GIADA)
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("job_id", jobId)
    expect(error?.message).toContain("permission denied")
  })

  test("a shortlisted application can be withdrawn", async () => {
    await signIn(GIADA)
    expect((await apply(jobId, MOTIVATION)).error).toBeNull()
    await signIn(ANTONY)
    await shortlist(jobId)
    await signIn(GIADA)
    await withdrawApplication(await applicationId(jobId))

    const { data, error } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .neq("status", "withdrawn")
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe("a job that is not open", () => {
  let jobId = null

  afterAll(async () => {
    try {
      if (jobId) await deleteOwnedJob(jobId)
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "a closed job refuses a new application",
    async () => {
      jobId = await createJobAs(ANTONY, crypto.randomUUID())
      await updateAsService("jobs", "id", jobId, { status: "closed" })

      await signIn(GIADA)
      const { error } = await apply(jobId, MOTIVATION)
      expect(error.message).toContain("Job is not open for applications")
    },
    TEST_TIMEOUT_MS,
  )
})

describe("the shortlist cap", () => {
  let jobId = null
  let userId = null

  afterAll(async () => {
    try {
      if (jobId) await deleteOwnedJob(jobId)
    } finally {
      try {
        if (userId) await deleteSignedUpUser(userId)
      } finally {
        await signOut()
      }
    }
  }, TEST_TIMEOUT_MS)

  test(
    "a full shortlist refuses another name",
    async () => {
      const id = crypto.randomUUID()
      const email = `vitest-${id}@vaitu.local`
      userId = await signUp({ email, fullName: `Vitest ${id}` })

      jobId = await createJobAs(ANTONY, crypto.randomUUID(), undefined, {
        max_applicants: SHORTLIST_CAP,
      })

      await signIn(GIADA)
      const {
        data: { user: poster },
      } = await supabase.auth.getUser()
      expect((await apply(jobId, MOTIVATION)).error).toBeNull()

      await signIn({ email, password: PASSWORD })
      expect((await apply(jobId, MOTIVATION)).error).toBeNull()

      await signIn(ANTONY)
      const { error: firstError } = await supabase
        .from("applications")
        .update({ status: "shortlisted" })
        .eq("id", await applicationIdFor(jobId, poster.id))
      expect(firstError).toBeNull()

      const { error: secondError } = await supabase
        .from("applications")
        .update({ status: "shortlisted" })
        .eq("id", await applicationIdFor(jobId, userId))
      expect(secondError.message).toContain("Shortlist is full")
    },
    TEST_TIMEOUT_MS,
  )
})

describe("the applicant's own status", () => {
  let jobId = null

  afterAll(async () => {
    try {
      if (jobId) await deleteOwnedJob(jobId)
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "the applicant cannot shortlist or select themselves",
    async () => {
      jobId = await createJobAs(ANTONY, crypto.randomUUID())
      await signIn(GIADA)
      expect((await apply(jobId, MOTIVATION)).error).toBeNull()
      const id = await applicationId(jobId)

      const { error: shortlistError } = await supabase
        .from("applications")
        .update({ status: "shortlisted" })
        .eq("id", id)
      expect(shortlistError).not.toBeNull()
      expect(shortlistError.message).toContain(
        "cannot change this application status",
      )

      const { data: afterShortlist, error: shortlistReadError } = await supabase
        .from("applications")
        .select("status")
        .eq("id", id)
        .single()
      expect(shortlistReadError).toBeNull()
      expect(afterShortlist.status).toBe("pending")

      const { error: selectError } = await supabase
        .from("applications")
        .update({ status: "selected" })
        .eq("id", id)
      expect(selectError?.message).toContain(
        "cannot change this application status",
      )
      const { data: afterSelect, error: selectReadError } = await supabase
        .from("applications")
        .select("status")
        .eq("id", id)
        .single()
      expect(selectReadError).toBeNull()
      expect(afterSelect.status).toBe("pending")
    },
    TEST_TIMEOUT_MS,
  )
})

describe("someone else's application", () => {
  let jobId = null
  let userId = null

  afterAll(async () => {
    try {
      if (jobId) await deleteOwnedJob(jobId)
    } finally {
      try {
        if (userId) await deleteSignedUpUser(userId)
      } finally {
        await signOut()
      }
    }
  }, TEST_TIMEOUT_MS)

  test(
    "another account cannot read it",
    async () => {
      jobId = await createJobAs(ANTONY, crypto.randomUUID())
      await signIn(GIADA)
      expect((await apply(jobId, MOTIVATION)).error).toBeNull()
      const id = await applicationId(jobId)

      const accountId = crypto.randomUUID()
      const email = `vitest-${accountId}@vaitu.local`
      userId = await signUp({ email, fullName: `Vitest ${accountId}` })
      await signIn({ email, password: PASSWORD })

      const { data: rows, error } = await supabase
        .from("applications")
        .select("motivation")
        .eq("id", id)
      expect(error).toBeNull()
      expect(rows).toEqual([])
      await expect(fetchReceivedDetail(id)).rejects.toThrow()

      await signIn(ANTONY)
      const { data: owned, error: ownedError } = await supabase
        .from("applications")
        .select("motivation")
        .eq("id", id)
        .single()
      expect(ownedError).toBeNull()
      expect(owned.motivation).toBe(MOTIVATION)
    },
    TEST_TIMEOUT_MS,
  )
})

describe("applying twice", () => {
  let jobId = null

  afterAll(async () => {
    try {
      if (jobId) await deleteOwnedJob(jobId)
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "the same account cannot apply twice",
    async () => {
      jobId = await createJobAs(ANTONY, crypto.randomUUID())
      await signIn(GIADA)
      expect((await apply(jobId, MOTIVATION)).error).toBeNull()

      const { error } = await apply(jobId, MOTIVATION)
      expect(error.message).toContain("duplicate key")
    },
    TEST_TIMEOUT_MS,
  )
})

describe("rewriting an application", () => {
  let jobId = null
  let otherJobId = null

  afterAll(async () => {
    try {
      if (jobId) await deleteOwnedJob(jobId)
      if (otherJobId) await deleteOwnedJob(otherJobId)
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "only the applicant's motivation and the status can change",
    async () => {
      jobId = await createJobAs(ANTONY, crypto.randomUUID())
      otherJobId = await createJobAs(
        ANTONY,
        crypto.randomUUID(),
        pastDeadline(),
      )
      await signIn(GIADA)
      expect((await apply(jobId, MOTIVATION)).error).toBeNull()
      const id = await applicationId(jobId)

      const { error: moveError } = await supabase
        .from("applications")
        .update({ job_id: otherJobId })
        .eq("id", id)
      expect(moveError?.message).toContain("permission denied")

      expect(await updateMotivation(id, `${MOTIVATION}, edited`)).toBe(true)

      await signIn(ANTONY)
      const {
        data: { user: owner },
      } = await supabase.auth.getUser()
      const { error: motivationError } = await supabase
        .from("applications")
        .update({ motivation: "Rewritten by the owner" })
        .eq("id", id)
      expect(motivationError?.message).toContain(
        "cannot change this motivation",
      )
      const { error: applicantError } = await supabase
        .from("applications")
        .update({ applicant_id: owner.id })
        .eq("id", id)
      expect(applicantError?.message).toContain("permission denied")

      const { data, error } = await supabase
        .from("applications")
        .select("job_id, motivation")
        .eq("id", id)
        .single()
      expect(error).toBeNull()
      expect(data).toEqual({
        job_id: jobId,
        motivation: `${MOTIVATION}, edited`,
      })
    },
    TEST_TIMEOUT_MS,
  )
})

async function apply(jobId, motivation) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return supabase.from("applications").insert({
    job_id: jobId,
    applicant_id: user.id,
    motivation,
  })
}

async function applicationId(jobId) {
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("job_id", jobId)
    .neq("status", "withdrawn")
    .single()
  if (error) throw error
  return data.id
}

async function statusOf(applicationId) {
  const { data, error } = await supabase
    .from("applications")
    .select("status")
    .eq("id", applicationId)
    .single()
  if (error) throw error
  return data.status
}

async function setStatus(applicationId, status) {
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
  if (error) throw error
}

async function applicationIdFor(jobId, applicantId) {
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("job_id", jobId)
    .eq("applicant_id", applicantId)
    .neq("status", "withdrawn")
    .single()
  if (error) throw error
  return data.id
}

function assignWinner(jobId, applicationId) {
  return supabase.rpc("assign_winner", {
    p_job_id: jobId,
    p_application_id: applicationId,
  })
}

async function shortlist(jobId) {
  const id = await applicationId(jobId)
  const { error } = await supabase
    .from("applications")
    .update({ status: "shortlisted" })
    .eq("id", id)
  if (error) throw error
  return id
}
