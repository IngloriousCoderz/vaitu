import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  createEventAs,
  deleteOwnedEvent,
  deleteSignedUpUser,
  pastDeadline,
  SEEKER,
  SENDER,
  signIn,
  signOut,
} from "../testing/index.js"
import { giveUpApplication, withdrawApplication } from "./applications.js"
import { supabase } from "./client.js"

const MOTIVATION = "Available the whole day"
const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000
const SHORTLIST_CAP = 1

async function apply(eventId, motivation) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return supabase.from("applications").insert({
    event_id: eventId,
    applicant_id: user.id,
    motivation,
  })
}

async function applicationId(eventId) {
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("event_id", eventId)
    .single()
  if (error) throw error
  return data.id
}

async function applicationIdFor(eventId, applicantId) {
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("event_id", eventId)
    .eq("applicant_id", applicantId)
    .single()
  if (error) throw error
  return data.id
}

function assignWinner(eventId, applicationId) {
  return supabase.rpc("assign_winner", {
    p_event_id: eventId,
    p_application_id: applicationId,
  })
}

async function shortlist(eventId) {
  const id = await applicationId(eventId)
  const { error } = await supabase
    .from("applications")
    .update({ status: "shortlisted" })
    .eq("id", id)
  if (error) throw error
  return id
}

describe("applying and choosing a winner", () => {
  let eventId = null

  beforeAll(async () => {
    eventId = await createEventAs(SEEKER, crypto.randomUUID())
  })

  afterAll(async () => {
    if (eventId) await deleteOwnedEvent(eventId)
    await signOut()
  })

  test("the owner cannot apply to their own event", async () => {
    await signIn(SEEKER)
    const { error } = await apply(eventId, MOTIVATION)
    expect(error.message).toContain("You cannot apply to your own event")
  })

  test("someone else can apply to that event", async () => {
    await signIn(SENDER)
    const { error } = await apply(eventId, MOTIVATION)
    expect(error).toBeNull()
  })

  test("the owner can see that application", async () => {
    await signIn(SEEKER)
    const { data, error } = await supabase
      .from("applications")
      .select(
        "motivation, applicant:profiles!applications_applicant_id_fkey(full_name)",
      )
      .eq("event_id", eventId)
    expect(error).toBeNull()
    expect(data).toEqual([
      { motivation: MOTIVATION, applicant: { full_name: "Test Sender" } },
    ])
  })

  test("a pending application cannot win", async () => {
    await signIn(SEEKER)
    const { error } = await assignWinner(eventId, await applicationId(eventId))
    expect(error.message).toContain("Winner must come from the shortlist")
  })

  test("the owner shortlists the application", async () => {
    await signIn(SEEKER)
    const id = await applicationId(eventId)
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
    await signIn(SENDER)
    const { error } = await assignWinner(eventId, await applicationId(eventId))
    expect(error.message).toContain("Only the event owner can assign a winner")
  })

  test("the owner assigns the winner", async () => {
    await signIn(SEEKER)
    const id = await applicationId(eventId)
    const { error } = await assignWinner(eventId, id)
    expect(error).toBeNull()

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("status")
      .eq("id", id)
      .single()
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("status")
      .eq("id", eventId)
      .single()
    expect(applicationError).toBeNull()
    expect(eventError).toBeNull()
    expect(application.status).toBe("selected")
    expect(event.status).toBe("assigned")
  })

  test("a selected application cannot be withdrawn", async () => {
    await signIn(SENDER)
    await expect(
      withdrawApplication(await applicationId(eventId)),
    ).rejects.toThrow("Selected applications cannot be withdrawn")
  })

  test("the winner giving up reopens the event", async () => {
    await signIn(SENDER)
    const id = await applicationId(eventId)
    await giveUpApplication(id)

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("status")
      .eq("id", id)
      .single()
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("status")
      .eq("id", eventId)
      .single()
    expect(applicationError).toBeNull()
    expect(eventError).toBeNull()
    expect(application.status).toBe("shortlisted")
    expect(event.status).toBe("open")
  })
})

describe("a passed deadline", () => {
  const eventIds = []

  afterAll(async () => {
    for (const id of eventIds) await deleteOwnedEvent(id)
    await signOut()
  })

  test("a new application is refused", async () => {
    const eventId = await createEventAs(
      SEEKER,
      crypto.randomUUID(),
      pastDeadline(),
    )
    eventIds.push(eventId)
    await signIn(SENDER)
    const { error } = await apply(eventId, MOTIVATION)
    expect(error.message).toContain("Application deadline has passed")
  })

  test("giving up after the deadline leaves the event assigned", async () => {
    const eventId = await createEventAs(SEEKER, crypto.randomUUID())
    eventIds.push(eventId)
    await signIn(SENDER)
    expect((await apply(eventId, MOTIVATION)).error).toBeNull()
    await signIn(SEEKER)
    const id = await shortlist(eventId)
    expect((await assignWinner(eventId, id)).error).toBeNull()

    const { error: deadlineError } = await supabase
      .from("events")
      .update({ application_deadline: pastDeadline() })
      .eq("id", eventId)
    expect(deadlineError).toBeNull()

    await signIn(SENDER)
    await giveUpApplication(id)
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("status")
      .eq("id", id)
      .single()
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("status")
      .eq("id", eventId)
      .single()
    expect(applicationError).toBeNull()
    expect(eventError).toBeNull()
    expect(application.status).toBe("shortlisted")
    expect(event.status).toBe("assigned")
  })
})

describe("withdrawing an application", () => {
  let eventId = null

  // Created here rather than inside the first test, so the second one does not
  // depend on its predecessor having run.
  beforeAll(async () => {
    eventId = await createEventAs(SEEKER, crypto.randomUUID())
  })

  afterAll(async () => {
    if (eventId) await deleteOwnedEvent(eventId)
    await signOut()
  })

  test("a pending application can be withdrawn", async () => {
    await signIn(SENDER)
    expect((await apply(eventId, MOTIVATION)).error).toBeNull()
    await withdrawApplication(await applicationId(eventId))

    const { data, error } = await supabase
      .from("applications")
      .select("id")
      .eq("event_id", eventId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  test("a shortlisted application can be withdrawn", async () => {
    await signIn(SENDER)
    expect((await apply(eventId, MOTIVATION)).error).toBeNull()
    await signIn(SEEKER)
    await shortlist(eventId)
    await signIn(SENDER)
    await withdrawApplication(await applicationId(eventId))

    const { data, error } = await supabase
      .from("applications")
      .select("id")
      .eq("event_id", eventId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe("an event that is not open", () => {
  let eventId = null

  afterAll(async () => {
    try {
      if (eventId) await deleteOwnedEvent(eventId)
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "a closed event refuses a new application",
    async () => {
      eventId = await createEventAs(SEEKER, crypto.randomUUID())
      const { error: closeError } = await supabase
        .from("events")
        .update({ status: "closed" })
        .eq("id", eventId)
      expect(closeError).toBeNull()

      await signIn(SENDER)
      const { error } = await apply(eventId, MOTIVATION)
      expect(error.message).toContain("Event is not open for applications")
    },
    TEST_TIMEOUT_MS,
  )
})

describe("the shortlist cap", () => {
  let eventId = null
  let userId = null

  afterAll(async () => {
    try {
      if (eventId) await deleteOwnedEvent(eventId)
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: SEEKER.password,
        options: { data: { full_name: `Vitest ${id}` } },
      })
      expect(signUpError).toBeNull()
      userId = data.user.id

      eventId = await createEventAs(SEEKER, crypto.randomUUID(), undefined, {
        max_applicants: SHORTLIST_CAP,
      })

      await signIn(SENDER)
      const {
        data: { user: sender },
      } = await supabase.auth.getUser()
      expect((await apply(eventId, MOTIVATION)).error).toBeNull()

      await signIn({ email, password: SEEKER.password })
      expect((await apply(eventId, MOTIVATION)).error).toBeNull()

      await signIn(SEEKER)
      const { error: firstError } = await supabase
        .from("applications")
        .update({ status: "shortlisted" })
        .eq("id", await applicationIdFor(eventId, sender.id))
      expect(firstError).toBeNull()

      const { error: secondError } = await supabase
        .from("applications")
        .update({ status: "shortlisted" })
        .eq("id", await applicationIdFor(eventId, userId))
      expect(secondError.message).toContain("Shortlist is full")
    },
    TEST_TIMEOUT_MS,
  )
})

describe("the applicant's own status", () => {
  let eventId = null

  afterAll(async () => {
    try {
      if (eventId) await deleteOwnedEvent(eventId)
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "the applicant cannot shortlist or select themselves",
    async () => {
      eventId = await createEventAs(SEEKER, crypto.randomUUID())
      await signIn(SENDER)
      expect((await apply(eventId, MOTIVATION)).error).toBeNull()
      const id = await applicationId(eventId)

      // The applicant must not be able to move their own status, so the write
      // has to be refused. Asserting that directly is the point of the test;
      // reading the row back afterwards only inferred it, and hid the error
      // that says who the write actually ran as.
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

describe("applying twice", () => {
  let eventId = null

  afterAll(async () => {
    try {
      if (eventId) await deleteOwnedEvent(eventId)
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "the same account cannot apply twice",
    async () => {
      eventId = await createEventAs(SEEKER, crypto.randomUUID())
      await signIn(SENDER)
      expect((await apply(eventId, MOTIVATION)).error).toBeNull()

      const { error } = await apply(eventId, MOTIVATION)
      expect(error.message).toContain("duplicate key")
    },
    TEST_TIMEOUT_MS,
  )
})
