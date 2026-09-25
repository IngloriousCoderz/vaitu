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

// Boundary layer: snake_case rows → camelCase view models, with derived
// display fields (dateLabel, daysLeft, isNew, hue) computed here so the
// store and templates only ever see the frontend shape.
function toViewModel(row) {
  const [year, month, day] = row.event_date.split("-").map(Number)
  return {
    id: row.id,
    spouseFirstName1: row.details.spouseFirstName1,
    spouseFirstName2: row.details.spouseFirstName2,
    location: row.location,
    dateLabel: `${MONTHS[month - 1]} ${String(day).padStart(2, "0")}`,
    style: row.details.style,
    daysLeft: Math.ceil(
      (new Date(row.application_deadline).getTime() - Date.now()) / DAY_MS,
    ),
    isNew: Date.now() - new Date(row.created_at).getTime() < NEW_THRESHOLD_MS,
    hue: [...row.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7),
    year,
  }
}

export async function fetchOpenEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("id, location, event_date, application_deadline, created_at, details")
    .eq("status", "open")
    .order("application_deadline", { ascending: true })
    .abortSignal(AbortSignal.timeout(15000))
  if (error) throw error
  return data.map(toViewModel)
}
