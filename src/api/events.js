import { supabase } from "./client.js"

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
    region: row.region,
    event_date: row.event_date,
    event_in_days: Math.ceil(
      (new Date(row.event_date).getTime() - Date.now()) / DAY_MS,
    ),
    subtitle: `${row.location} • ${MONTHS[month - 1]} ${String(day).padStart(2, "0")}`,
    days_left: Math.ceil(
      (new Date(row.application_deadline).getTime() - Date.now()) / DAY_MS,
    ),
    is_new:
      Date.now() - new Date(row.created_at).getTime() < NEW_THRESHOLD_MS,
    hue: [...row.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7),
    year,
  }

  if (row.category === "festival") {
    return {
      ...base,
      title: row.title,
      tag: genreLabels[row.details.genre] ?? row.details.genre,
      filter_value: row.details.genre,
      facts: [{ label: "Headliner", value: row.details.headliner }],
    }
  }

  const couple = `${row.details.spouse_first_name_1} & ${row.details.spouse_first_name_2}`
  return {
    ...base,
    title: couple,
    tag: styleLabels[row.details.style] ?? row.details.style,
    filter_value: row.details.style,
    facts: [{ label: "Spouses", value: couple }],
  }
}

export function countdownLabel(event) {
  if (event.is_new && event.days_left > 2) return "Just opened — apply early"
  if (event.days_left > 1)
    return `Applications close in ${event.days_left} days`
  if (event.hours_left > 1)
    return `Applications close in ${event.hours_left} hours`
  if (event.hours_left === 1) return "Applications close in 1 hour"
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
      hours_left: Math.max(
        0,
        Math.ceil(
          (new Date(event.application_deadline).getTime() - Date.now()) /
            3600000,
        ),
      ),
    },
    sender_name: sender.full_name,
  }
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
