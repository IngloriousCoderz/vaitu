import { DATE_ISO_LENGTH, PAD_LENGTH, SINGULAR } from "../../constants/index.js"
import { randomId } from "../../text/index.js"

export function calendarLinks({ title, eventDate, location }) {
  if (!eventDate) return null
  const start = toStamp(eventDate)
  const end = endExclusive(eventDate)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: "Booked via vaitu",
    location,
  })
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//vaitu//event//EN",
    "BEGIN:VEVENT",
    `UID:${randomId()}@vaitu`,
    `DTSTAMP:${toStamp(new Date().toISOString())}T000000Z`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeIcs(title)}`,
    `LOCATION:${escapeIcs(location)}`,
    "DESCRIPTION:Booked via vaitu",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
  return {
    googleUrl: `https://calendar.google.com/calendar/render?${params}`,
    ics,
  }
}

// YYYY-MM-DD, or the start of an ISO timestamp, as the YYYYMMDD iCalendar uses.
function toStamp(dateStr) {
  return dateStr.slice(0, DATE_ISO_LENGTH).replaceAll("-", "")
}

function endExclusive(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number)
  const next = new Date(Date.UTC(year, month - SINGULAR, day + SINGULAR))
  const pad = (value) => String(value).padStart(PAD_LENGTH, "0")
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + SINGULAR)}${pad(next.getUTCDate())}`
}

function escapeIcs(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}
