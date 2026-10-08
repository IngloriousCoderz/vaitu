import {
  CLOSING_MAX_DAYS,
  FIRST_INDEX,
  HUE_DEGREES,
  HUE_SHIFT,
  LAST_INDEX_OFFSET,
  WEEK_DAYS,
  ZERO,
} from "../../constants.js"

export function monogram(title) {
  const parts = title.split(" ").filter((word) => word && word !== "&")
  const first = parts.at(FIRST_INDEX)?.at(FIRST_INDEX) ?? ""
  const last =
    parts.length > LAST_INDEX_OFFSET
      ? (parts.at(parts.length - LAST_INDEX_OFFSET)?.at(FIRST_INDEX) ?? "")
      : ""
  return last === "" ? first : `${first}&${last}`
}

export function deadlineBadge(event) {
  if (event.status === "assigned") return "ASSIGNED"
  if (event.daysLeft <= ZERO) return "CLOSED"
  if (event.daysLeft <= CLOSING_MAX_DAYS) return "CLOSING"
  if (event.daysLeft < WEEK_DAYS) return `${event.daysLeft}D LEFT`
  return `${Math.round(event.daysLeft / WEEK_DAYS)}W LEFT`
}

export function deadlineTone(event) {
  if (event.daysLeft <= ZERO) return "closed"
  if (event.daysLeft <= CLOSING_MAX_DAYS) return "closing"
  return null
}

export function thumbGradient(hue) {
  return `linear-gradient(135deg, hsl(${hue} 25% 38%), hsl(${(hue + HUE_SHIFT) % HUE_DEGREES} 30% 22%))`
}
