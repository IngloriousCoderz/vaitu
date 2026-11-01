import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { emptyReview, isReviewDue } from "./helpers.js"

describe("isReviewDue", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2027-06-10T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const winner = { status: "selected", job_reviews: null }

  it("waits for the event date, and includes the day itself", () => {
    expect(isReviewDue(winner, "2027-06-11")).toBe(false)
    expect(isReviewDue(winner, "2027-06-10")).toBe(true)
    expect(isReviewDue(winner, "2027-06-09")).toBe(true)
  })

  it("is only for a winner with no report yet", () => {
    expect(isReviewDue({ ...winner, status: "rejected" }, "2027-06-09")).toBe(
      false,
    )
    expect(
      isReviewDue(
        { ...winner, job_reviews: { outcome: "completed" } },
        "2027-06-09",
      ),
    ).toBe(false)
  })
})

describe("emptyReview", () => {
  it("starts from a job done, with no stars yet", () => {
    expect(emptyReview()).toMatchObject({ outcome: "completed", rating: 0 })
  })
})
