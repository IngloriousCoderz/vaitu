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
    }
  }

  const couple = `${row.details.spouseFirstName1} & ${row.details.spouseFirstName2}`
  return {
    ...base,
    title: couple,
    tag: styleLabels[row.details.style] ?? row.details.style,
    filterValue: row.details.style,
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
