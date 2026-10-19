import { beforeAll, describe, expect, it } from "vitest"

import { CLOSING_MAX_DAYS, WEEK_DAYS } from "../../constants/index.js"
import { ready } from "../../i18n/index.js"
import {
  deadlineBadge,
  deadlineTone,
  eventSubtitle,
  monogram,
} from "./helpers.js"

describe("deadline", () => {
  beforeAll(() => ready)

  it("shows assigned ahead of the days still left", () => {
    const event = { status: "assigned", daysLeft: WEEK_DAYS }
    expect(deadlineBadge(event)).toBe("ASSIGNED")
  })

  it("closes the badge at the deadline and marks the last day as closing", () => {
    expect(deadlineBadge({ daysLeft: 0 })).toBe("CLOSED")
    expect(deadlineBadge({ daysLeft: -1 })).toBe("CLOSED")
    expect(deadlineBadge({ daysLeft: CLOSING_MAX_DAYS })).toBe("CLOSING")
  })

  it("counts days until a week, then rounds to weeks", () => {
    expect(deadlineBadge({ daysLeft: WEEK_DAYS - 1 })).toBe("6D LEFT")
    expect(deadlineBadge({ daysLeft: WEEK_DAYS })).toBe("1W LEFT")
    expect(deadlineBadge({ daysLeft: WEEK_DAYS + 4 })).toBe("2W LEFT")
  })

  it("tones a closed or closing deadline and leaves the rest unmarked", () => {
    expect(deadlineTone({ daysLeft: 0 })).toBe("closed")
    expect(deadlineTone({ daysLeft: CLOSING_MAX_DAYS })).toBe("closing")
    expect(deadlineTone({ status: "assigned", daysLeft: WEEK_DAYS })).toBe(null)
  })
})

describe("monogram", () => {
  it("joins the first and last initials and skips the ampersand", () => {
    expect(monogram("Ada & Grace")).toBe("A&G")
    expect(monogram("Ada Grace Hopper")).toBe("A&H")
    expect(monogram("Ada")).toBe("A")
  })
})

describe("eventSubtitle", () => {
  it("keeps the event's calendar day in the active locale", () => {
    expect(
      eventSubtitle({
        event_date: "2026-10-24",
        place: "Florence • Tuscany",
      }),
    ).toBe("Florence • Tuscany • Oct 24")
  })
})
