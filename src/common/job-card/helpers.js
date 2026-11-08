import {
  CLOSING_MAX_DAYS,
  FIRST_INDEX,
  HUE_DEGREES,
  HUE_SHIFT,
  LAST_INDEX_OFFSET,
  NO_DAYS_LEFT,
  WEEK_DAYS,
} from "../../constants/index.js"
import { GENRE_CATEGORIES, jobTypeId } from "../../data/job-taxonomy.js"
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

export function jobMonogram(job) {
  if (job.category === "wedding") return monogram(job.title)
  return job.title.at(FIRST_INDEX)?.toUpperCase() ?? ""
}

export function deadlineBadge(job) {
  if (job.status === "assigned") return t("badge.assigned")
  if (job.daysLeft <= NO_DAYS_LEFT) return t("badge.closed")
  if (job.daysLeft <= CLOSING_MAX_DAYS) return t("badge.closing")
  if (job.daysLeft < WEEK_DAYS)
    return t("badge.daysLeft", { count: job.daysLeft })
  return t("badge.weeksLeft", { count: Math.round(job.daysLeft / WEEK_DAYS) })
}

export function deadlineTone(job) {
  if (job.status === "assigned") return "assigned"
  if (job.daysLeft <= NO_DAYS_LEFT) return "closed"
  if (job.daysLeft <= CLOSING_MAX_DAYS) return "closing"
  return null
}

export function thumbGradient(hue) {
  return `linear-gradient(135deg, hsl(${hue} 25% 38%), hsl(${(hue + HUE_SHIFT) % HUE_DEGREES} 30% 22%))`
}

export function jobSubtitle(job) {
  const date = new Intl.DateTimeFormat(currentLocale(), {
    month: "short",
    day: "2-digit",
  }).format(new Date(`${job.job_date}T00:00`))
  return [job.place, date].filter(Boolean).join(" • ")
}

export function jobTag(job) {
  if (!job.filterValue) return ""
  const kind = GENRE_CATEGORIES.includes(job.category) ? "genre" : "style"
  return t(`taxonomy.${kind}.${job.filterValue}`, {
    defaultValue: job.filterValue,
  })
}

export function jobTypeLabel(job) {
  return t(`taxonomy.jobType.${jobTypeId(job.category, job.profession)}`)
}
