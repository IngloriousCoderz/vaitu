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
import { GENRE_CATEGORIES } from "../data/event-taxonomy.js"
import { canonicalRegion } from "../data/regions/resolve.js"
import { currentLocale, t } from "../i18n/index.js"
import {
  firstError,
  normalizeEvent,
  normalizePay,
  validateEvent,
} from "../validation/events.js"
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
  const [year] = row.event_date.split("-").map(Number)
  const region = canonicalRegion(row.region)
  const base = {
    id: row.id,
    category: row.category,
    profession: row.profession,
    status: row.status,
    region,
    event_date: row.event_date,
    application_deadline: row.application_deadline,
    created_at: row.created_at,
    eventInDays: Math.ceil(
      (new Date(row.event_date).getTime() - Date.now()) / DAY_MS,
    ),
    place: [row.location, region].filter(Boolean).join(" • "),
    imageUrls: row.image_urls ?? [],
    pay: row.event_pay ?? null,
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
  }

  if (GENRE_CATEGORIES.includes(row.category)) {
    return {
      ...base,
      title: row.title,
      filterValue: row.details.genre,
      facts: [
        { labelKey: "fields.headliner", value: row.details.headliner },
        ...(region ? [{ labelKey: "fields.region", value: region }] : []),
      ],
    }
  }

  if (row.category !== "wedding") {
    return {
      ...base,
      title: row.title,
      filterValue: null,
      facts: region ? [{ labelKey: "fields.region", value: region }] : [],
    }
  }

  const couple = `${row.details.spouse_first_name_1} & ${row.details.spouse_first_name_2}`
  return {
    ...base,
    title: couple,
    filterValue: row.details.style,
    facts: [
      { labelKey: "facts.spouses", value: couple },
      ...(region ? [{ labelKey: "fields.region", value: region }] : []),
    ],
  }
}

export function countdownLabel(event) {
  if (event.isNew && event.daysLeft > JUST_OPENED_MIN_DAYS)
    return t("countdown.justOpened")
  if (event.daysLeft > ONE_DAY)
    return t("countdown.days", { count: event.daysLeft })
  if (event.hoursLeft > ONE_HOUR)
    return t("countdown.hours", { count: event.hoursLeft })
  if (event.minutesLeft > ONE_MINUTE)
    return t("countdown.minutes", { count: event.minutesLeft })
  if (event.minutesLeft === ONE_MINUTE)
    return t("countdown.minutes", { count: event.minutesLeft })
  if (event.hoursLeft === ONE_HOUR)
    return t("countdown.hours", { count: event.hoursLeft })
  return t("countdown.closed")
}

export function isApplicationClosed(event) {
  return event.daysLeft <= NO_DAYS_LEFT
}

export async function fetchEventDetail(id) {
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, category, profession, status, sender_id, title, location, region, event_date, application_deadline, max_applicants, created_at, image_urls, details",
    )
    .eq("id", id)
    .single()
  if (error) throw error

  const { data: senderName, error: senderError } = await supabase.rpc(
    "event_poster_name",
    { p_event_id: id },
  )
  if (senderError) throw senderError

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const view = toViewModel(event)
  return {
    event: {
      ...view,
      pay: session ? await fetchEventPay(id) : null,
      senderId: event.sender_id,
      max_applicants: event.max_applicants,
      application_deadline: event.application_deadline,
      hoursLeft: Math.max(
        NO_TIME_LEFT,
        Math.ceil(
          (new Date(event.application_deadline).getTime() - Date.now()) /
            HOUR_MS,
        ),
      ),
      minutesLeft: Math.max(
        NO_TIME_LEFT,
        Math.ceil(
          (new Date(event.application_deadline).getTime() - Date.now()) /
            (HOUR_MS / MINUTES_PER_HOUR),
        ),
      ),
    },
    senderName: senderName ?? "",
  }
}

export async function fetchMyEvents() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id, category, profession, title, location, region, event_date, application_deadline, status, created_at, image_urls, details",
    )
    .eq("sender_id", user.id)
    .order("event_date", { ascending: true })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  if (!events.length) return []
  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select("event_id")
    .in(
      "event_id",
      events.map((event) => event.id),
    )
    .neq("status", "withdrawn")
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (applicationsError) throw applicationsError
  const counts = {}
  for (const row of applications ?? []) {
    counts[row.event_id] =
      (counts[row.event_id] ?? NO_APPLICATIONS) + ONE_APPLICATION
  }
  return events.map((row) => ({
    ...toViewModel(row),
    applications_count: counts[row.id] ?? NO_APPLICATIONS,
  }))
}

const PAY_COLUMNS = "kind, amount_min, amount_max, currency"

// Signed-in only: a client must not find what their photographer keeps.
async function fetchEventPay(event_id) {
  const { data, error } = await supabase
    .from("event_pay")
    .select(PAY_COLUMNS)
    .eq("event_id", event_id)
    .maybeSingle()
  if (error) throw error
  return data
}

async function savePay(event_id, pay) {
  const { error } = await supabase
    .from("event_pay")
    .upsert({ event_id, ...normalizePay(pay) })
  if (error) throw error
}

const OPEN_EVENT_COLUMNS =
  "id, category, profession, title, location, region, event_date, application_deadline, created_at, image_urls, details"

/**
 * One page of the open events a feed query matches (see feedQuery in
 * views/event-list), with how many it matches in all. Your own are left out:
 * they live in My events.
 * @param {ReturnType<typeof import("../views/event-list/query.js").feedQuery>} feed
 * @param {{ from: number, to: number }} range - Row indexes, both inclusive.
 */
export async function fetchOpenEventsPage(feed, { from, to }) {
  if (feed.regions?.length === NO_ROWS) return { events: [], total: NO_ROWS }
  const userId = readUserId()
  let query = supabase
    .from("events")
    .select(
      userId
        ? `${OPEN_EVENT_COLUMNS}, event_pay(${PAY_COLUMNS})`
        : OPEN_EVENT_COLUMNS,
      { count: "exact" },
    )
    .eq("status", "open")
  if (userId) query = query.neq("sender_id", userId)
  if (feed.jobTypes.length) query = query.in("job_type", feed.jobTypes)
  if (feed.details.length) {
    query = query.or(
      [
        `category.not.in.(${feed.details.flatMap((d) => d.categories).join(",")})`,
        ...feed.details.map(
          (d) => `details->>${d.key}.in.(${d.values.join(",")})`,
        ),
      ].join(","),
    )
  }
  if (feed.regions) query = query.in("region", feed.regions)
  if (feed.dateFrom) {
    query = query
      .gte("event_date", feed.dateFrom)
      .lte("event_date", feed.dateTo)
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
  return { events: data.map(toViewModel), total: count ?? NO_ROWS }
}

/**
 * Every region the feed could show an event in, as stored: open events other
 * than your own, of these job types (all of them when empty).
 * @param {string[]} jobTypes
 */
export async function fetchOpenEventRegions(jobTypes = []) {
  const { data, error } = await supabase
    .rpc("open_event_regions", { job_types: jobTypes })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return data
}

function escapeLike(text) {
  return text.replace(/[\\%_]/g, "\\$&")
}

export async function createEvent(payload) {
  const row = prepareEvent(payload)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("events")
    .insert({ ...row, sender_id: user.id, status: "open" })
    .select("id")
    .single()
  if (error) throw error
  await savePay(data.id, payload.pay)
  return true
}

export async function fetchEventForEdit(event_id) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, category, profession, title, location, country, region, event_date, application_deadline, max_applicants, image_urls, details, event_pay(kind, amount_min, amount_max, currency)",
    )
    .eq("id", event_id)
    .eq("sender_id", user.id)
    .single()
  if (error) throw error
  return data
}

export async function updateEvent(event_id, payload) {
  const row = prepareEvent(payload)
  const { error } = await supabase
    .from("events")
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", event_id)
  if (error) throw error
  if (payload.pay) await savePay(event_id, payload.pay)
  return true
}

export async function deleteEvent(event_id) {
  const { data, error } = await supabase
    .from("events")
    .select("image_urls")
    .eq("id", event_id)
    .maybeSingle()
  if (error) throw error

  const { error: deleteError } = await supabase.rpc("delete_event", {
    p_event_id: event_id,
  })
  if (deleteError) throw deleteError

  void removeEventAssets(data).catch((err) => {
    console.warn("[events] could not remove event assets:", err)
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
  if (error) throw voiceError(error)
  return data?.transcript ?? null
}

// The daily allowance is the one failure people can do something about.
function voiceError(error) {
  return error.context?.status === STATUS_TOO_MANY_REQUESTS
    ? new Error("errors.voiceLimit")
    : error
}

export async function fetchMyFeedDefaults() {
  const none = {
    favorite_regions: [],
    interested_job_types: [],
    professions: [],
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return none
  const { data, error } = await supabase
    .from("profiles")
    .select("favorite_regions, interested_job_types, professions")
    .eq("id", user.id)
    .single()
  if (error) return none
  return {
    favorite_regions: data?.favorite_regions ?? [],
    interested_job_types: data?.interested_job_types ?? [],
    professions: data?.professions ?? [],
  }
}

/**
 * @param {string} transcript
 * @param {{ job_type: string, job_types: string[] }} form - The job type the
 *   form is on, and those it offers: the only ones the answer can pick.
 */
export async function parseEvent(transcript, { job_type, job_types }) {
  const { data, error } = await supabase.functions.invoke("parse-event", {
    body: { transcript, job_type, job_types },
  })
  if (error) throw voiceError(error)
  return data?.fields ?? {}
}

function prepareEvent(payload) {
  const errors = validateEvent(payload)
  const message = firstError(errors)
  if (message) throw new Error(message)
  return normalizeEvent(payload)
}

async function removeEventAssets(event) {
  await Promise.all(
    (event?.image_urls ?? []).map((url) => {
      const ref = imageRefFromUrl(url)
      return ref ? deleteImage(ref.path, ref.bucket) : Promise.resolve()
    }),
  )
}
