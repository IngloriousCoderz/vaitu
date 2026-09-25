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

// Boundary layer: snake_case rows → generic camelCase view models.
// Each category maps its details into the same slots (title, subtitle, tag,
// filterValue) so templates never branch on category.
function toViewModel(row) {
  const [year, month, day] = row.event_date.split("-").map(Number)
  const base = {
    id: row.id,
    category: row.category,
    subtitle: `${row.location} • ${MONTHS[month - 1]} ${String(day).padStart(2, "0")}`,
    daysLeft: Math.ceil(
      (new Date(row.application_deadline).getTime() - Date.now()) / DAY_MS,
    ),
    isNew: Date.now() - new Date(row.created_at).getTime() < NEW_THRESHOLD_MS,
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

  const couple = `${row.details.spouseFirstName1} & ${row.details.spouseFirstName2}`
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
  if (event.daysLeft > 1) return `Applications close in ${event.daysLeft} days`
  if (event.hoursLeft > 1)
    return `Applications close in ${event.hoursLeft} hours`
  if (event.hoursLeft === 1) return "Applications close in 1 hour"
  return "Applications are closed"
}

export async function fetchEventDetail(id) {
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, category, sender_id, title, location, event_date, application_deadline, max_applicants, created_at, details",
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
      maxApplicants: event.max_applicants,
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

export async function fetchOpenEvents() {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, category, title, location, event_date, application_deadline, created_at, details",
    )
    .eq("status", "open")
    .order("application_deadline", { ascending: true })
    .abortSignal(AbortSignal.timeout(15000))
  if (error) throw error
  return data.map(toViewModel)
}
