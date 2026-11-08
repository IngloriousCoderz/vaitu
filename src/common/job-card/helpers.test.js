import { beforeAll, describe, expect, it } from "vitest"

import { CLOSING_MAX_DAYS, WEEK_DAYS } from "../../constants/index.js"
import { ready } from "../../i18n/index.js"
import {
  deadlineBadge,
  deadlineTone,
  jobMonogram,
  jobSubtitle,
  monogram,
} from "./helpers.js"

describe("deadline", () => {
  beforeAll(() => ready)

  it("shows assigned ahead of the days still left", () => {
    const job = { status: "assigned", daysLeft: WEEK_DAYS }
    expect(deadlineBadge(job)).toBe("ASSIGNED")
  })

  it("tells the winner the job is theirs", () => {
    const job = {
      status: "assigned",
      applicationStatus: "selected",
      daysLeft: WEEK_DAYS,
    }
    expect(deadlineBadge(job)).toBe("ASSIGNED TO YOU")
    expect(deadlineBadge({ ...job, applicationStatus: "rejected" })).toBe(
      "ASSIGNED",
    )
  })

  it("closes the badge at the deadline and marks the last day as closing", () => {
    expect(deadlineBadge({ daysLeft: 0 })).toBe("CLOSED")
    expect(deadlineBadge({ daysLeft: -1 })).toBe("CLOSED")
    expect(deadlineBadge({ daysLeft: CLOSING_MAX_DAYS })).toBe("CLOSING")
  })

  it("counts days until a week, then rounds to weeks", () => {
    expect(deadlineBadge({ daysLeft: WEEK_DAYS - 1 })).toBe("6 DAYS LEFT")
    expect(deadlineBadge({ daysLeft: WEEK_DAYS })).toBe("1 WEEK LEFT")
    expect(deadlineBadge({ daysLeft: WEEK_DAYS + 4 })).toBe("2 WEEKS LEFT")
  })

  it("tones a closed or closing deadline and leaves the rest unmarked", () => {
    expect(deadlineTone({ daysLeft: 0 })).toBe("closed")
    expect(deadlineTone({ daysLeft: CLOSING_MAX_DAYS })).toBe("closing")
    expect(deadlineTone({ status: "assigned", daysLeft: 0 })).toBe("assigned")
    expect(deadlineTone({ daysLeft: WEEK_DAYS })).toBe(null)
  })
})

describe("monogram", () => {
  it("joins the first and last initials and skips the ampersand", () => {
    expect(monogram("Ada & Grace")).toBe("A&G")
    expect(monogram("Ada Grace Hopper")).toBe("A&H")
    expect(monogram("Ada")).toBe("A")
  })
})

describe("jobMonogram", () => {
  it("pairs a couple's initials, and takes one letter from any other title", () => {
    expect(jobMonogram({ setting: "wedding", title: "Ada & Grace" })).toBe(
      "A&G",
    )
    expect(
      jobMonogram({ setting: "apartment", title: "deep clean, bilocale" }),
    ).toBe("D")
  })
})

describe("jobSubtitle", () => {
  it("keeps the job's calendar day in the active locale", () => {
    expect(
      jobSubtitle({
        job_date: "2026-10-24",
        place: "Florence • Tuscany",
      }),
    ).toBe("Florence • Tuscany • Oct 24")
  })
})
