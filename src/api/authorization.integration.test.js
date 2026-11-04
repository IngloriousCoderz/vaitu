import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, test } from "vitest"

import {
  deleteSignedUpUser,
  eventPayload,
  PASSWORD,
  readAsService,
  readEventAsService,
  removeStoredFile,
  setEventDate,
  signUp,
  updateAsService,
} from "../testing/index.js"

const TEST_TIMEOUT_MS = 60000
const PERMISSION_DENIED = "42501"
const PAST_DATE = "2020-01-01"
const AGREED_AMOUNT = 300

const PRIVATE_TABLES = [
  "profiles",
  "applications",
  "notifications",
  "job_reviews",
  "job_agreements",
  "job_settlements",
  "event_pay",
  "push_tokens",
  "blocks",
]

const SERVICE_TABLES = [
  "reports",
  "account_erasures",
  "voice_usage",
  "email_tokens",
  "email_budget",
  "alert_log",
  "check_email_rate_limits",
]

const cast = {}
const uploads = []

function client() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

async function actor(label) {
  const email = `vitest-authz-${label}-${crypto.randomUUID()}@vaitu.local`
  const userId = await signUp({ email, fullName: `Vitest ${label}` })
  const db = client()
  const { error } = await db.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (error) throw error
  return { userId, db }
}

async function must(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}

async function postEvent(owner) {
  const { id } = await must(
    owner.db
      .from("events")
      .insert({
        ...eventPayload(crypto.randomUUID()),
        sender_id: owner.userId,
        status: "open",
      })
      .select("id")
      .single(),
  )
  return id
}

async function applyTo(eventId, applicant) {
  const { id } = await must(
    applicant.db
      .from("applications")
      .insert({
        event_id: eventId,
        applicant_id: applicant.userId,
        motivation: "Free that day",
      })
      .select("id")
      .single(),
  )
  return id
}

async function upload(who, bucket, name, body, contentType) {
  const path = `${who.userId}/${name}`
  const { error } = await who.db.storage
    .from(bucket)
    .upload(path, new Blob([body], { type: contentType }), { contentType })
  if (!error) uploads.push([bucket, path])
  return error
}

beforeAll(async () => {
  cast.owner = await actor("owner")
  cast.winner = await actor("winner")
  cast.stranger = await actor("stranger")
  cast.anon = { db: client() }

  cast.openEventId = await postEvent(cast.owner)
  cast.pendingId = await applyTo(cast.openEventId, cast.winner)

  cast.jobEventId = await postEvent(cast.owner)
  cast.jobId = await applyTo(cast.jobEventId, cast.winner)
  await must(
    cast.owner.db
      .from("applications")
      .update({ status: "shortlisted" })
      .eq("id", cast.jobId),
  )
  await must(
    cast.owner.db.rpc("assign_winner", {
      p_event_id: cast.jobEventId,
      p_application_id: cast.jobId,
      p_agreed_amount: AGREED_AMOUNT,
    }),
  )
  await must(
    cast.winner.db.rpc("answer_job_agreement", {
      p_application_id: cast.jobId,
      p_is_confirmed: true,
    }),
  )
  await setEventDate(cast.jobEventId, PAST_DATE)
}, TEST_TIMEOUT_MS)

afterAll(async () => {
  for (const [bucket, path] of uploads) await removeStoredFile(bucket, path)
  for (const who of [cast.owner, cast.winner, cast.stranger]) {
    if (who) await deleteSignedUpUser(who.userId)
  }
}, TEST_TIMEOUT_MS)

describe("tables", () => {
  test.each(["anon", "stranger"])(
    "the %s reads none of the private rows",
    async (name) => {
      for (const table of PRIVATE_TABLES) {
        const { data } = await cast[name].db.from(table).select("*")
        const theirs = (data ?? []).filter((row) =>
          JSON.stringify(row).match(
            `${cast.owner.userId}|${cast.winner.userId}|${cast.jobEventId}|${cast.openEventId}`,
          ),
        )
        expect(theirs, table).toEqual([])
      }
    },
    TEST_TIMEOUT_MS,
  )

  test.each(["anon", "stranger", "owner"])(
    "the %s can neither read nor write the service tables",
    async (name) => {
      for (const table of SERVICE_TABLES) {
        const read = await cast[name].db.from(table).select("*")
        expect(read.error?.code, `select ${table}`).toBe(PERMISSION_DENIED)
        const write = await cast[name].db.from(table).insert({})
        expect(write.error?.code, `insert ${table}`).toBe(PERMISSION_DENIED)
      }
    },
    TEST_TIMEOUT_MS,
  )

  test("job reviews are written only through submit_job_review", async () => {
    const { error } = await cast.owner.db.from("job_reviews").insert({
      application_id: cast.jobId,
      outcome: "completed",
      rating: 5,
    })
    expect(error?.code).toBe(PERMISSION_DENIED)
  })

  test("applications and events are never deleted from the client", async () => {
    const application = await cast.winner.db
      .from("applications")
      .delete()
      .eq("id", cast.pendingId)
    expect(application.error?.code).toBe(PERMISSION_DENIED)
    const event = await cast.owner.db
      .from("events")
      .delete()
      .eq("id", cast.openEventId)
    expect(event.error?.code).toBe(PERMISSION_DENIED)
  })
})

describe("internal functions", () => {
  const internal = () => [
    ["notify_user", { p_user: cast.winner.userId, p_type: "new_event" }],
    ["retire_event", { p_event_id: cast.openEventId }],
    ["retire_profile_activity", { p_user_id: cast.winner.userId }],
    ["record_job_agreement", { p_application_id: cast.jobId, p_amount: 1 }],
    ["claim_voice_use", { p_user_id: cast.winner.userId, p_kind: "parse" }],
    ["release_voice_use", { p_user_id: cast.winner.userId, p_kind: "parse" }],
    ["voice_budget_reached", {}],
    ["record_voice_seconds", { p_user_id: cast.winner.userId, p_seconds: 1 }],
    ["account_exists", { p_email: "giada@vaitu.local" }],
    ["check_email_rate_limit", { p_ip_hash: "vitest" }],
    ["claim_alert", { p_key: "vitest" }],
    ["email_recipients", { p_user_ids: [cast.winner.userId] }],
    ["mute_email_type", { p_token: "vitest", p_type: "new_event" }],
    ["count_emails_sent", { p_count: 1 }],
    ["can_read_reputation", { p_profile_id: cast.winner.userId }],
    ["close_expired_events", {}],
    ["request_job_outcomes", {}],
    ["vaitu_wake_emails", {}],
  ]

  test.each(["anon", "stranger"])(
    "the %s cannot call any of them",
    async (name) => {
      for (const [fn, params] of internal()) {
        const { error } = await cast[name].db.rpc(fn, params)
        expect(error?.code, fn).toBe(PERMISSION_DENIED)
      }
    },
    TEST_TIMEOUT_MS,
  )
})

describe("a stranger", () => {
  test("cannot edit someone else's event", async () => {
    await cast.stranger.db
      .from("events")
      .update({ title: "Hijacked" })
      .eq("id", cast.openEventId)
    const event = await readEventAsService(cast.openEventId)
    expect(event.title).not.toBe("Hijacked")
  })

  test("cannot decide on applications to someone else's event", async () => {
    await cast.stranger.db
      .from("applications")
      .update({ status: "rejected" })
      .eq("id", cast.pendingId)
    const [application] = await readAsService(
      "applications",
      "id",
      cast.pendingId,
    )
    expect(application.status).toBe("pending")
  })

  test("cannot apply in someone else's name", async () => {
    const { error } = await cast.stranger.db.from("applications").insert({
      event_id: cast.openEventId,
      applicant_id: cast.owner.userId,
      motivation: "Not me",
    })
    expect(error).not.toBeNull()
  })

  test("cannot act on someone else's job", async () => {
    const calls = [
      ["delete_event", { p_event_id: cast.openEventId }],
      [
        "assign_winner",
        { p_event_id: cast.openEventId, p_application_id: cast.pendingId },
      ],
      ["withdraw_application", { p_application_id: cast.pendingId }],
      ["propose_job_agreement", { p_application_id: cast.jobId, p_amount: 1 }],
      [
        "answer_job_agreement",
        { p_application_id: cast.jobId, p_is_confirmed: false },
      ],
      [
        "answer_job_settlement",
        { p_application_id: cast.jobId, p_is_settled: false },
      ],
      [
        "submit_job_review",
        { p_application_id: cast.jobId, p_outcome: "no_show" },
      ],
    ]
    for (const [fn, params] of calls) {
      const { error } = await cast.stranger.db.rpc(fn, params)
      expect(error, fn).not.toBeNull()
    }
    expect(
      await readAsService("job_reviews", "application_id", cast.jobId),
    ).toEqual([])
    expect(
      await readAsService("job_settlements", "application_id", cast.jobId),
    ).toEqual([])
  })

  test("cannot read an applicant's contact details", async () => {
    const { data } = await cast.stranger.db.rpc("applicant_profiles", {
      p_application_ids: [cast.pendingId, cast.jobId],
    })
    expect(data).toEqual([])
  })

  test("cannot upload into someone else's folder", async () => {
    const { error } = await cast.stranger.db.storage
      .from("avatars")
      .upload(`${cast.winner.userId}/avatar.png`, new Blob(["x"]), {
        contentType: "image/png",
      })
    expect(error).not.toBeNull()
  })
})

describe("the applicant", () => {
  test("cannot decide on their own application", async () => {
    await cast.winner.db
      .from("applications")
      .update({ status: "shortlisted" })
      .eq("id", cast.pendingId)
    const [application] = await readAsService(
      "applications",
      "id",
      cast.pendingId,
    )
    expect(application.status).toBe("pending")
  })

  test("cannot write the account flags of their profile", async () => {
    for (const fields of [
      { is_active: false },
      { deactivated_at: new Date().toISOString() },
      { last_login_at: new Date().toISOString() },
    ]) {
      const { error } = await cast.winner.db
        .from("profiles")
        .update(fields)
        .eq("id", cast.winner.userId)
      expect(error?.code, Object.keys(fields)[0]).toBe(PERMISSION_DENIED)
    }
  })

  test("cannot rewrite their notifications beyond reading them", async () => {
    const { error } = await cast.winner.db
      .from("notifications")
      .update({ pushed_at: null, emailed_at: null })
      .eq("user_id", cast.winner.userId)
    expect(error?.code).toBe(PERMISSION_DENIED)
  })
})

describe("the owner", () => {
  test("gets an applicant's contact details and nothing else", async () => {
    const { data: rows } = await cast.owner.db
      .from("profiles")
      .select("*")
      .eq("id", cast.winner.userId)
    expect(rows).toEqual([])

    const { data } = await cast.owner.db.rpc("applicant_profiles", {
      p_application_ids: [cast.pendingId],
    })
    expect(data).toEqual([
      {
        application_id: cast.pendingId,
        full_name: "Vitest winner",
        website: null,
        phone: null,
        country: null,
      },
    ])
  })

  test("cannot hand the event to someone else or undelete it", async () => {
    for (const fields of [
      { sender_id: cast.stranger.userId },
      { deleted_at: null },
      { outcome_requested_at: null },
    ]) {
      const { error } = await cast.owner.db
        .from("events")
        .update(fields)
        .eq("id", cast.openEventId)
      expect(error?.code, Object.keys(fields)[0]).toBe(PERMISSION_DENIED)
    }
  })

  test("cannot post an event that is already assigned", async () => {
    const { data, error } = await cast.owner.db
      .from("events")
      .insert({
        ...eventPayload(crypto.randomUUID()),
        sender_id: cast.owner.userId,
        status: "assigned",
      })
      .select("id")
      .maybeSingle()
    if (data) await cast.owner.db.rpc("delete_event", { p_event_id: data.id })
    expect(error).not.toBeNull()
  })

  test("cannot mark an event assigned without picking a winner", async () => {
    const { error } = await cast.owner.db
      .from("events")
      .update({ status: "assigned" })
      .eq("id", cast.openEventId)
    const event = await readEventAsService(cast.openEventId)
    if (event.status === "assigned") {
      await updateAsService("events", "id", cast.openEventId, {
        status: "open",
      })
    }
    expect(error).not.toBeNull()
  })

  test("cannot take the job back from the winner", async () => {
    await cast.owner.db
      .from("applications")
      .update({ status: "rejected" })
      .eq("id", cast.jobId)
    const [application] = await readAsService("applications", "id", cast.jobId)
    expect(application.status).toBe("selected")
  })
})

describe("storage", () => {
  test("nobody can list who has uploaded files", async () => {
    await upload(cast.winner, "avatars", "avatar.png", "x", "image/png")
    for (const bucket of ["avatars", "event-images", "event-ics"]) {
      const { data } = await cast.anon.db.storage.from(bucket).list()
      expect(data ?? [], bucket).toEqual([])
    }
  })

  test("the calendar bucket only takes calendars", async () => {
    const error = await upload(
      cast.winner,
      "event-ics",
      "page.html",
      "<script>alert(1)</script>",
      "text/html",
    )
    expect(error).not.toBeNull()
  })
})
