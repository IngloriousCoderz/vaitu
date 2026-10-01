import { supabase } from "./client.js"
import { createEventSchema } from "../validation/events.js"

const DAY_MS = 86400000
const NEW_THRESHOLD_MS = 3 * DAY_MS
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
    subtitle: `${row.location} • ${MONTHS[month - 1]} ${String(day).padStart(2, "0")}`,
    daysLeft: Math.ceil(
      (new Date(row.application_deadline).getTime() - Date.now()) / DAY_MS,
    ),
    isNew:
      Date.now() - new Date(row.created_at).getTime() < NEW_THRESHOLD_MS,
    hue: [...row.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7),
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
  if (event.isNew && event.daysLeft > 2) return "Just opened — apply early"
  if (event.daysLeft > 1)
    return `Applications close in ${event.daysLeft} days`
  if (event.hoursLeft > 1)
    return `Applications close in ${event.hoursLeft} hours`
  if (event.hoursLeft === 1) return "Applications close in 1 hour"
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
        0,
        Math.ceil(
          (new Date(event.application_deadline).getTime() - Date.now()) /
            3600000,
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
    .abortSignal(AbortSignal.timeout(15000))
  if (error) throw error
  if (events.length === 0) return []
  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select("event_id")
    .in(
      "event_id",
      events.map((event) => event.id),
    )
    .abortSignal(AbortSignal.timeout(15000))
  if (applicationsError) throw applicationsError
  const counts = {}
  for (const row of applications ?? []) {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1
  }
  return events.map((row) => ({
    ...toViewModel(row),
    applications_count: counts[row.id] ?? 0,
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
    .abortSignal(AbortSignal.timeout(15000))
  if (error) throw error
  return data.map(toViewModel)
}

export async function createEvent(payload) {
  const parsed = createEventSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid event")
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
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid event")
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
