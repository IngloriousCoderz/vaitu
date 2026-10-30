import {
  CLOSING_MAX_DAYS,
  FIRST_INDEX,
  HUE_DEGREES,
  HUE_SHIFT,
  LAST_INDEX_OFFSET,
  NO_DAYS_LEFT,
  WEEK_DAYS,
} from "../../constants/index.js"
import { currentLocale, t } from "../../i18n/index.js"

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
  if (event.status === "assigned") return t("badge.assigned")
  if (event.daysLeft <= NO_DAYS_LEFT) return t("badge.closed")
  if (event.daysLeft <= CLOSING_MAX_DAYS) return t("badge.closing")
  if (event.daysLeft < WEEK_DAYS)
    return t("badge.daysLeft", { count: event.daysLeft })
  return t("badge.weeksLeft", { count: Math.round(event.daysLeft / WEEK_DAYS) })
}

export function deadlineTone(event) {
  if (event.daysLeft <= NO_DAYS_LEFT) return "closed"
  if (event.daysLeft <= CLOSING_MAX_DAYS) return "closing"
  return null
}

export function thumbGradient(hue) {
  return `linear-gradient(135deg, hsl(${hue} 25% 38%), hsl(${(hue + HUE_SHIFT) % HUE_DEGREES} 30% 22%))`
}

export function eventSubtitle(event) {
  const date = new Intl.DateTimeFormat(currentLocale(), {
    month: "short",
    day: "2-digit",
  }).format(new Date(`${event.event_date}T00:00`))
  return [event.place, date].filter(Boolean).join(" • ")
}

export function eventTag(event) {
  if (!event.filterValue) return ""
  const kind = event.category === "festival" ? "genre" : "style"
  return t(`taxonomy.${kind}.${event.filterValue}`, {
    defaultValue: event.filterValue,
  })
}
