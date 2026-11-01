import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { isSettlementOpen } from "./index.js"

describe("isSettlementOpen", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2027-06-10T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const job = {
    status: "selected",
    agreement: { status: "confirmed" },
    event_date: "2027-06-10",
    review: null,
  }

  it("opens on the date of a job with a confirmed amount", () => {
    expect(isSettlementOpen(job)).toBe(true)
    expect(isSettlementOpen({ ...job, event_date: "2027-06-11" })).toBe(false)
  })

  it("needs a confirmed amount and a winner", () => {
    expect(isSettlementOpen({ ...job, agreement: null })).toBe(false)
    expect(
      isSettlementOpen({ ...job, agreement: { status: "proposed" } }),
    ).toBe(false)
    expect(isSettlementOpen({ ...job, status: "rejected" })).toBe(false)
  })

  it("stays closed for a job that did not take place", () => {
    expect(isSettlementOpen({ ...job, review: { outcome: "no_show" } })).toBe(
      false,
    )
    expect(isSettlementOpen({ ...job, review: { outcome: "completed" } })).toBe(
      true,
    )
  })
})
