import {
  DAY_MS,
  FIRST_INDEX,
  HASH_MULTIPLIER,
  HASH_SEED,
  HOUR_MS,
  HUE_DEGREES,
  JUST_OPENED_MIN_DAYS,
  MINUTES_PER_HOUR,
  NO_DAYS_LEFT,
  NO_TIME_LEFT,
  ONE_DAY,
  ONE_HOUR,
  ONE_MINUTE,
  REQUEST_TIMEOUT_MS,
} from "../constants/index.js"
import { DETAIL_FIELDS, settingSpecs } from "../data/job-taxonomy.js"
import { canonicalRegion } from "../data/regions/resolve.js"
import { currentLocale, t } from "../i18n/index.js"
import {
  firstError,
  normalizeJob,
  normalizePay,
  validateJob,
} from "../validation/jobs.js"
import { supabase } from "./client.js"
import { deleteImage, imageRefFromUrl } from "./images.js"
import { readUserId } from "./session.js"

const NO_APPLICATIONS = 0
const NO_ROWS = 0
const ONE_APPLICATION = 1

const STATUS_TOO_MANY_REQUESTS = 429

const NEW_THRESHOLD_DAYS = 3
const NEW_THRESHOLD_MS = NEW_THRESHOLD_DAYS * DAY_MS

export function toViewModel(row) {
  const [year] = row.job_date.split("-").map(Number)
  const region = canonicalRegion(row.region)
  const base = {
    id: row.id,
    setting: row.setting,
    profession: row.profession,
    status: row.status,
    region,
    job_date: row.job_date,
    application_deadline: row.application_deadline,
    created_at: row.created_at,
    jobInDays: Math.ceil(
      (new Date(row.job_date).getTime() - Date.now()) / DAY_MS,
    ),
    place: [row.location, region].filter(Boolean).join(" • "),
    imageUrls: row.image_urls ?? [],
    description: row.description ?? null,
    pay: row.job_pay ?? null,
    daysLeft: Math.ceil(
      (new Date(row.application_deadline).getTime() - Date.now()) / DAY_MS,
    ),
    isNew: Date.now() - new Date(row.created_at).getTime() < NEW_THRESHOLD_MS,
    hue: [...row.id].reduce(
      (h, ch) =>
        (h * HASH_MULTIPLIER + ch.charCodeAt(FIRST_INDEX)) % HUE_DEGREES,
      HASH_SEED,
    ),
    year,
    filterValues: DETAIL_FIELDS.flatMap((field) => row.details[field] ?? []),
  }

  const spec = settingSpecs[row.setting]

  if (spec.textFields.includes("headliner")) {
    return {
      ...base,
      title: row.title,
      facts: [
        { label: "fields.headliner", value: row.details.headliner },
        ...(region ? [{ label: "fields.region", value: region }] : []),
      ],
    }
  }

  if (spec.isTitled) {
    return {
      ...base,
      title: row.title,
      facts: region ? [{ label: "fields.region", value: region }] : [],
    }
  }

  const couple = `${row.details.spouse_first_name_1} & ${row.details.spouse_first_name_2}`
  return {
    ...base,
    title: couple,
    facts: [
      { label: "facts.spouses", value: couple },
      ...(region ? [{ label: "fields.region", value: region }] : []),
    ],
  }
}

export function countdownLabel(job) {
  if (job.isNew && job.daysLeft > JUST_OPENED_MIN_DAYS)
    return t("countdown.justOpened")
  if (job.daysLeft > ONE_DAY)
    return t("countdown.days", { count: job.daysLeft })
  if (job.hoursLeft > ONE_HOUR)
    return t("countdown.hours", { count: job.hoursLeft })
  if (job.minutesLeft > ONE_MINUTE)
    return t("countdown.minutes", { count: job.minutesLeft })
  if (job.minutesLeft === ONE_MINUTE)
    return t("countdown.minutes", { count: job.minutesLeft })
  if (job.hoursLeft === ONE_HOUR)
    return t("countdown.hours", { count: job.hoursLeft })
  return t("countdown.closed")
}

export function isApplicationClosed(job) {
  return job.daysLeft <= NO_DAYS_LEFT
}

export async function fetchJobDetail(id) {
  const { data: job, error } = await supabase
    .from("jobs")
    .select(
      "id, setting, profession, status, poster_id, title, location, region, job_date, application_deadline, max_applicants, created_at, image_urls, details, description",
    )
    .eq("id", id)
    .single()
  if (error) throw error

  const { data: posterName, error: posterError } = await supabase.rpc(
    "job_poster_name",
    { p_job_id: id },
  )
  if (posterError) throw posterError

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const view = toViewModel(job)
  return {
    job: {
      ...view,
      pay: session ? await fetchJobPay(id) : null,
      applicationStatus: session
        ? await fetchMyApplicationStatus(id, session.user.id)
        : null,
      posterId: job.poster_id,
      max_applicants: job.max_applicants,
      application_deadline: job.application_deadline,
      hoursLeft: Math.max(
        NO_TIME_LEFT,
        Math.ceil(
          (new Date(job.application_deadline).getTime() - Date.now()) / HOUR_MS,
        ),
      ),
      minutesLeft: Math.max(
        NO_TIME_LEFT,
        Math.ceil(
          (new Date(job.application_deadline).getTime() - Date.now()) /
            (HOUR_MS / MINUTES_PER_HOUR),
        ),
      ),
    },
    posterName: posterName ?? "",
  }
}

async function fetchMyApplicationStatus(job_id, applicant_id) {
  const { data, error } = await supabase
    .from("applications")
    .select("status")
    .eq("job_id", job_id)
    .eq("applicant_id", applicant_id)
    .neq("status", "withdrawn")
    .maybeSingle()
  if (error) throw error
  return data?.status ?? null
}

export async function fetchMyJobs() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, setting, profession, title, location, region, job_date, application_deadline, status, created_at, image_urls, details",
    )
    .eq("poster_id", user.id)
    .order("job_date", { ascending: true })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  if (!jobs.length) return []
  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select("job_id")
    .in(
      "job_id",
      jobs.map((job) => job.id),
    )
    .neq("status", "withdrawn")
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (applicationsError) throw applicationsError
  const counts = {}
  for (const row of applications ?? []) {
    counts[row.job_id] =
      (counts[row.job_id] ?? NO_APPLICATIONS) + ONE_APPLICATION
  }
  return jobs.map((row) => ({
    ...toViewModel(row),
    applications_count: counts[row.id] ?? NO_APPLICATIONS,
  }))
}

const PAY_COLUMNS = "kind, amount_min, amount_max, currency"

// Signed-in only: a client must not find what their photographer keeps.
async function fetchJobPay(job_id) {
  const { data, error } = await supabase
    .from("job_pay")
    .select(PAY_COLUMNS)
    .eq("job_id", job_id)
    .maybeSingle()
  if (error) throw error
  return data
}

async function savePay(job_id, pay) {
  const { error } = await supabase
    .from("job_pay")
    .upsert({ job_id, ...normalizePay(pay) })
  if (error) throw error
}

const FEED_JOB_COLUMNS =
  "id, setting, profession, status, title, location, region, job_date, application_deadline, created_at, image_urls, details"

/**
 * One page of the jobs a feed query matches (see feedQuery in
 * views/job-list), with how many it matches in all: open jobs, and the ones
 * you won until their day. Your own are left out: they live in My jobs.
 * @param {ReturnType<typeof import("../views/job-list/query.js").feedQuery>} feed
 * @param {{ from: number, to: number }} range - Row indexes, both inclusive.
 */
export async function fetchOpenJobsPage(feed, { from, to }) {
  if (feed.regions?.length === NO_ROWS) return { jobs: [], total: NO_ROWS }
  const scope = scopeFilter(feed.scope)
  if (!scope) return { jobs: [], total: NO_ROWS }
  const userId = readUserId()
  let query = supabase
    .from("jobs")
    .select(
      userId
        ? `${FEED_JOB_COLUMNS}, job_pay(${PAY_COLUMNS})`
        : FEED_JOB_COLUMNS,
      { count: "exact" },
    )
    .or(scope)
  if (userId) query = query.neq("poster_id", userId)
  if (feed.jobTypes.length) query = query.in("job_type", feed.jobTypes)
  if (feed.details.length) {
    query = query.or(
      [
        `setting.not.in.(${feed.details.flatMap((d) => d.settings).join(",")})`,
        ...feed.details.flatMap((d) =>
          d.values.map((value) => `details->${d.key}.cs.["${value}"]`),
        ),
      ].join(","),
    )
  }
  if (feed.regions) query = query.in("region", feed.regions)
  if (feed.dateFrom) {
    query = query.gte("job_date", feed.dateFrom).lte("job_date", feed.dateTo)
  }
  if (feed.search) {
    query = query.ilike("search_text", `%${escapeLike(feed.search)}%`)
  }
  for (const [column, ascending] of feed.order) {
    query = query.order(column, { ascending })
  }
  const { data, error, count } = await query
    .order("id")
    .range(from, to)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return { jobs: data.map(toViewModel), total: count ?? NO_ROWS }
}

// The feed's status filter as one PostgREST `or`, or null when it can match
// nothing, such as "applied" before any application.
function scopeFilter({ openJobs, appliedJobIds, wonJobIds, wonFrom }) {
  const applied = appliedJobIds.join(",")
  const parts = []
  if (openJobs === "all") parts.push("status.eq.open")
  if (openJobs === "notApplied") {
    parts.push(
      applied ? `and(status.eq.open,id.not.in.(${applied}))` : "status.eq.open",
    )
  }
  if (openJobs === "applied" && applied) {
    parts.push(`and(status.eq.open,id.in.(${applied}))`)
  }
  if (wonJobIds.length) {
    parts.push(
      `and(status.eq.assigned,id.in.(${wonJobIds.join(",")}),job_date.gte.${wonFrom})`,
    )
  }
  return parts.length ? parts.join(",") : null
}

/**
 * Every region the feed could show a job in with no filters, as stored: open
 * jobs other than your own, and the ones you won until their day, of these
 * job types (all of them when empty).
 * @param {string[]} [jobTypes]
 * @param {{ wonJobIds?: string[], today?: string }} [won]
 */
export async function fetchFeedRegions(
  jobTypes = [],
  { wonJobIds = [], today } = {},
) {
  const [open, won] = await Promise.all([
    supabase
      .rpc("open_job_regions", { job_types: jobTypes })
      .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS)),
    wonJobIds.length ? wonJobRegions(jobTypes, wonJobIds, today) : null,
  ])
  if (open.error) throw open.error
  if (won?.error) throw won.error
  return [
    ...new Set([...open.data, ...(won?.data ?? []).map((row) => row.region)]),
  ]
}

function wonJobRegions(jobTypes, wonJobIds, today) {
  let query = supabase
    .from("jobs")
    .select("region")
    .eq("status", "assigned")
    .in("id", wonJobIds)
  if (today) query = query.gte("job_date", today)
  if (jobTypes.length) query = query.in("job_type", jobTypes)
  return query.abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
}

function escapeLike(text) {
  return text.replace(/[\\%_]/g, "\\$&")
}

export async function createJob(payload) {
  const row = prepareJob(payload)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("errors.notLoggedIn")
  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...row, poster_id: user.id, status: "open" })
    .select("id")
    .single()
  if (error) throw error
  await savePay(data.id, payload.pay)
  return true
}

export async function fetchJobForEdit(job_id) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("errors.notLoggedIn")
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, setting, profession, title, location, country, region, job_date, application_deadline, max_applicants, image_urls, details, description, job_pay(kind, amount_min, amount_max, currency)",
    )
    .eq("id", job_id)
    .eq("poster_id", user.id)
    .single()
  if (error) throw error
  return data
}

export async function updateJob(job_id, payload) {
  const row = prepareJob(payload)
  const { error } = await supabase
    .from("jobs")
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", job_id)
  if (error) throw error
  if (payload.pay) await savePay(job_id, payload.pay)
  return true
}

export async function deleteJob(job_id) {
  const { data, error } = await supabase
    .from("jobs")
    .select("image_urls")
    .eq("id", job_id)
    .maybeSingle()
  if (error) throw error

  const { error: deleteError } = await supabase.rpc("delete_job", {
    p_job_id: job_id,
  })
  if (deleteError) throw deleteError

  void removeJobAssets(data).catch((err) => {
    console.warn("[jobs] could not remove job assets:", err)
  })
  return true
}

/**
 * The recording goes to the function in the request and is never stored.
 * @param {Blob} blob
 */
export async function transcribeAudio(blob) {
  const { data, error } = await supabase.functions.invoke(
    `transcribe-audio?locale=${currentLocale()}`,
    { body: blob, headers: { "Content-Type": blob.type || "audio/webm" } },
  )
  if (error) throw await voiceError(error)
  return data?.transcript ?? null
}

// The daily limits are the failures people can do something about.
async function voiceError(error) {
  if (error.context?.status !== STATUS_TOO_MANY_REQUESTS) return error
  const body = await error.context.json().catch(() => null)
  return new Error(
    body?.error === "voice_paused" ? "errors.voicePaused" : "errors.voiceLimit",
  )
}

export async function fetchMyFeedDefaults() {
  const none = {
    favorite_regions: [],
    interested_settings: [],
    professions: [],
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return none
  const { data, error } = await supabase
    .from("profiles")
    .select("favorite_regions, interested_settings, professions")
    .eq("id", user.id)
    .single()
  if (error) return none
  return {
    favorite_regions: data?.favorite_regions ?? [],
    interested_settings: data?.interested_settings ?? [],
    professions: data?.professions ?? [],
  }
}

/**
 * @param {string} transcript
 * @param {{ job_type: string, job_types: string[] }} form - The job type the
 *   form is on, and those it offers: the only ones the answer can pick.
 */
export async function parseJob(transcript, { job_type, job_types, today }) {
  const { data, error } = await supabase.functions.invoke("parse-job", {
    body: { transcript, job_type, job_types, today },
  })
  if (error) throw await voiceError(error)
  return data?.fields ?? {}
}

function prepareJob(payload) {
  const errors = validateJob(payload)
  const message = firstError(errors)
  if (message) throw new Error(message)
  return normalizeJob(payload)
}

async function removeJobAssets(job) {
  await Promise.all(
    (job?.image_urls ?? []).map((url) => {
      const ref = imageRefFromUrl(url)
      return ref ? deleteImage(ref.path, ref.bucket) : Promise.resolve()
    }),
  )
}
