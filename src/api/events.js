import {
  DAY_MS,
  FIRST_INDEX,
  HASH_MULTIPLIER,
  HASH_SEED,
  HOUR_MS,
  HUE_DEGREES,
  JUST_OPENED_MIN_DAYS,
  MONTH_INDEX_OFFSET,
  PAD_LENGTH,
  REQUEST_TIMEOUT_MS,
  SINGULAR,
  ZERO,
} from "../constants.js"
import { createEventSchema } from "../validation/events.js"
import { supabase } from "./client.js"

const NEW_THRESHOLD_DAYS = 3
const NEW_THRESHOLD_MS = NEW_THRESHOLD_DAYS * DAY_MS
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const genreLabels = {
  house: "House",
  techno: "Techno",
  indie: "Indie",
  jazz: "Jazz",
  electronic: "Electronic",
}

const styleLabels = {
  editorial: "Editorial",
  documentary: "Documentary",
  reportage: "Reportage",
  classic: "Classic",
  film: "Film",
  fine_art: "Fine Art",
}

// Boundary layer: rows → generic view models. Field names mirror the DB
// (snake_case, no conversion); only display derivations happen here.
export function toViewModel(row) {
  const [year, month, day] = row.event_date.split("-").map(Number)
  const base = {
    id: row.id,
    category: row.category,
    status: row.status,
    region: row.region,
    event_date: row.event_date,
    eventInDays: Math.ceil(
      (new Date(row.event_date).getTime() - Date.now()) / DAY_MS,
    ),
    subtitle: `${row.location} • ${MONTHS[month - MONTH_INDEX_OFFSET]} ${String(day).padStart(PAD_LENGTH, "0")}`,
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
      tag: genreLabels[row.details.genre] ?? row.details.genre,
      filterValue: row.details.genre,
      facts: [{ label: "Headliner", value: row.details.headliner }],
    }
  }

  const couple = `${row.details.spouse_first_name_1} & ${row.details.spouse_first_name_2}`
  return {
    ...base,
    title: couple,
    tag: styleLabels[row.details.style] ?? row.details.style,
    filterValue: row.details.style,
    facts: [{ label: "Spouses", value: couple }],
  }
}

export function countdownLabel(event) {
  if (event.isNew && event.daysLeft > JUST_OPENED_MIN_DAYS)
    return "Just opened — apply early"
  if (event.daysLeft > SINGULAR)
    return `Applications close in ${event.daysLeft} days`
  if (event.hoursLeft > SINGULAR)
    return `Applications close in ${event.hoursLeft} hours`
  if (event.hoursLeft === SINGULAR) return "Applications close in 1 hour"
  return "Applications are closed"
}

export async function fetchEventDetail(id) {
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, category, sender_id, title, location, region, event_date, application_deadline, max_applicants, created_at, details",
    )
    .eq("id", id)
    .eq("status", "open")
    .single()
  if (error) throw error

  const { data: sender, error: senderError } = await supabase
    .from("sender_profiles_public")
    .select("full_name")
    .eq("id", event.sender_id)
    .single()
  if (senderError) throw senderError

  const view = toViewModel(event)
  return {
    event: {
      ...view,
      max_applicants: event.max_applicants,
      hoursLeft: Math.max(
        ZERO,
        Math.ceil(
          (new Date(event.application_deadline).getTime() - Date.now()) /
            HOUR_MS,
        ),
      ),
    },
    senderName: sender.full_name,
  }
}

export async function fetchMyEvents() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id, category, title, location, region, event_date, application_deadline, status, created_at, details",
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
    counts[row.event_id] = (counts[row.event_id] ?? ZERO) + SINGULAR
  }
  return events.map((row) => ({
    ...toViewModel(row),
    applications_count: counts[row.id] ?? ZERO,
  }))
}

export async function fetchOpenEvents() {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, category, title, location, region, event_date, application_deadline, created_at, details",
    )
    .eq("status", "open")
    .order("application_deadline", { ascending: true })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return data.map(toViewModel)
}

export async function createEvent(payload) {
  const parsed = createEventSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[FIRST_INDEX]?.message ?? "Invalid event",
    )
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const { error } = await supabase.from("events").insert({
    ...parsed.data,
    sender_id: user.id,
    status: "open",
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
      "id, category, title, location, country, region, event_date, application_deadline, max_applicants, details",
    )
    .eq("id", event_id)
    .eq("sender_id", user.id)
    .single()
  if (error) throw error
  return data
}

export async function updateEvent(event_id, payload) {
  const parsed = createEventSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[FIRST_INDEX]?.message ?? "Invalid event",
    )
  }
  const { error } = await supabase
    .from("events")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", event_id)
  if (error) throw error
  return true
}

export async function deleteEvent(event_id) {
  const { error } = await supabase.from("events").delete().eq("id", event_id)
  if (error) throw error
  return true
}
