import {
  DAY_MS,
  DEFAULT_TRANSCRIPT_STATUS,
  FIRST_INDEX,
  HASH_MULTIPLIER,
  HASH_SEED,
  HOUR_MS,
  HUE_DEGREES,
  JUST_OPENED_MIN_DAYS,
  MINUTES_PER_HOUR,
  NO_DAYS_LEFT,
  NO_TIME_LEFT,
  NOT_FOUND,
  ONE_DAY,
  ONE_HOUR,
  ONE_MINUTE,
  REQUEST_TIMEOUT_MS,
} from "../constants/index.js"
import { canonicalRegion, uniqueRegions } from "../data/regions/resolve.js"
import { t } from "../i18n/index.js"
import { randomId } from "../text/index.js"
import {
  firstError,
  normalizeEvent,
  validateEvent,
} from "../validation/events.js"
import { supabase } from "./client.js"
import { deleteImage, imageRefFromUrl } from "./images.js"

const NO_APPLICATIONS = 0
const ONE_APPLICATION = 1

const NEW_THRESHOLD_DAYS = 3
const NEW_THRESHOLD_MS = NEW_THRESHOLD_DAYS * DAY_MS

const AUDIO_BUCKET = "event-audio"

// Boundary layer: rows → generic view models. Field names mirror the DB
// (snake_case, no conversion); only display derivations happen here.
export function toViewModel(row) {
  const [year] = row.event_date.split("-").map(Number)
  const region = canonicalRegion(row.region)
  const base = {
    id: row.id,
    category: row.category,
    status: row.status,
    region,
    event_date: row.event_date,
    application_deadline: row.application_deadline,
    created_at: row.created_at,
    eventInDays: Math.ceil(
      (new Date(row.event_date).getTime() - Date.now()) / DAY_MS,
    ),
    // Display text is derived at render (see common/event-card), so it
    // follows the active language: the date is formatted then, in its locale.
    place: [row.location, region].filter(Boolean).join(" • "),
    audio_url: row.audio_url ?? null,
    imageUrls: row.image_urls ?? [],
    transcript: row.transcript ?? null,
    transcript_status: row.transcript_status ?? "none",
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

  if (row.category === "festival") {
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
      "id, category, status, sender_id, title, location, region, event_date, application_deadline, max_applicants, created_at, audio_url, image_urls, transcript, transcript_status, details",
    )
    .eq("id", id)
    .single()
  if (error) throw error

  const { data: senderName, error: senderError } = await supabase.rpc(
    "event_poster_name",
    { p_event_id: id },
  )
  if (senderError) throw senderError

  const view = toViewModel(event)
  return {
    event: {
      ...view,
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
      "id, category, title, location, region, event_date, application_deadline, status, created_at, image_urls, details",
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

export async function fetchOpenEvents() {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, category, title, location, region, event_date, application_deadline, created_at, image_urls, details",
    )
    .eq("status", "open")
    .order("application_deadline", { ascending: true })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return data.map(toViewModel)
}

export async function createEvent(payload) {
  const row = prepareEvent(payload)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { error } = await supabase.from("events").insert({
    ...row,
    sender_id: user.id,
    status: "open",
    transcript_status: row.transcript_status ?? DEFAULT_TRANSCRIPT_STATUS,
  })
  if (error) throw error
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
      "id, category, title, location, country, region, event_date, application_deadline, max_applicants, audio_url, image_urls, transcript, details",
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
  return true
}

export async function deleteEvent(event_id) {
  // Read the assets before the row goes away: once it is deleted there is no
  // record of which files belonged to it. The cleanup itself is best effort and
  // runs after the delete, so a stuck bucket never blocks the event removal.
  const { data, error } = await supabase
    .from("events")
    .select("image_urls, audio_url")
    .eq("id", event_id)
    .maybeSingle()
  if (error) throw error

  const { error: deleteError } = await supabase
    .from("events")
    .delete()
    .eq("id", event_id)
  if (deleteError) throw deleteError

  void removeEventAssets(data).catch((err) => {
    console.warn("[events] could not remove event assets:", err)
  })
  return true
}

export async function uploadEventAudio(blob) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const ext = blob.type.includes("mp4") ? "m4a" : "webm"
  const path = `${user.id}/${randomId()}.${ext}`
  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, blob, { contentType: blob.type || "audio/webm" })
  if (error) throw error
  return {
    path,
    url: supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path).data.publicUrl,
  }
}

export async function transcribeAudio(path) {
  const { data, error } = await supabase.functions.invoke("transcribe-audio", {
    body: { audio_path: path },
  })
  if (error) throw error
  return data?.transcript ?? null
}

export async function deleteEventAudio(path) {
  const { error } = await supabase.storage.from(AUDIO_BUCKET).remove([path])
  if (error) throw error
}

export async function saveFavoriteRegions(regions) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const favorite_regions = uniqueRegions(regions ?? [])
  const { error } = await supabase
    .from("profiles")
    .update({ favorite_regions })
    .eq("id", user.id)
  if (error) throw error
  return favorite_regions
}

export async function fetchMyFavoriteRegions() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("profiles")
    .select("favorite_regions")
    .eq("id", user.id)
    .single()
  if (error) return []
  return data?.favorite_regions ?? []
}

export async function parseEvent(transcript) {
  const { data, error } = await supabase.functions.invoke("parse-event", {
    body: { transcript },
  })
  if (error) throw error
  return data?.fields ?? {}
}

// The form only has room for one message, so the first error stands in for the
// whole set. Validating and normalizing stay separate: one decides whether the
// write is allowed, the other decides what the row looks like.
function prepareEvent(payload) {
  const errors = validateEvent(payload)
  const message = firstError(errors)
  if (message) throw new Error(message)
  return normalizeEvent(payload)
}

async function removeEventAssets(event) {
  const jobs = (event?.image_urls ?? []).map((url) => {
    const ref = imageRefFromUrl(url)
    return ref ? deleteImage(ref.path, ref.bucket) : Promise.resolve()
  })
  const audioPath = audioPathFromUrl(event?.audio_url)
  if (audioPath) jobs.push(deleteEventAudio(audioPath))
  await Promise.all(jobs)
}

function audioPathFromUrl(url) {
  if (typeof url !== "string") return null
  const marker = `/${AUDIO_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === NOT_FOUND) return null
  const [path] = url.slice(index + marker.length).split(/[?#]/)
  return path ? decodeURIComponent(path) : null
}
