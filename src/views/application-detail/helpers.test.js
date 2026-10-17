import { describe, expect, it } from "vitest"

import { calendarLinks } from "./helpers.js"

describe("calendarLinks", () => {
  const links = calendarLinks({
    title: "Ada & Grace",
    eventDate: "2026-06-01",
    location: "Villa",
  })

  it("dates the event in the compact form iCalendar uses", () => {
    expect(links.ics).toContain("DTSTART;VALUE=DATE:20260601")
    expect(new URL(links.googleUrl).searchParams.get("dates")).toMatch(
      /^20260601\/\d{8}$/,
    )
  })

  it("stamps the file with today's date", () => {
    const today = new Date().toISOString().slice(0, 10).replaceAll("-", "")
    expect(links.ics).toContain(`DTSTAMP:${today}T000000Z`)
  })
})
