import { beforeAll, describe, expect, it } from "vitest"

import { JUST_OPENED_MIN_DAYS } from "../constants/index.js"
import { ready } from "../i18n/index.js"
import { countdownLabel, isApplicationClosed } from "./events.js"

describe("countdownLabel", () => {
  beforeAll(() => ready)

  it("calls a new event just opened while more than two days remain", () => {
    expect(
      countdownLabel(
        event({ isNew: true, daysLeft: JUST_OPENED_MIN_DAYS + 1 }),
      ),
    ).toBe("Just opened — apply early")
  })

  it("counts days once the just-opened window has passed", () => {
    expect(
      countdownLabel(event({ isNew: true, daysLeft: JUST_OPENED_MIN_DAYS })),
    ).toBe("Applications close in 2 days")
    expect(countdownLabel(event({ daysLeft: 5 }))).toBe(
      "Applications close in 5 days",
    )
  })

  it("drops to hours, then minutes, on the last day", () => {
    expect(countdownLabel(event({ daysLeft: 1, hoursLeft: 3 }))).toBe(
      "Applications close in 3 hours",
    )
    expect(countdownLabel(event({ hoursLeft: 1 }))).toBe(
      "Applications close in 1 hour",
    )
    expect(countdownLabel(event({ minutesLeft: 3 }))).toBe(
      "Applications close in 3 minutes",
    )
    expect(countdownLabel(event({ minutesLeft: 1 }))).toBe(
      "Applications close in 1 minute",
    )
  })

  it("closes when no time is left", () => {
    expect(countdownLabel(event({ daysLeft: -1 }))).toBe(
      "Applications are closed",
    )
  })
})

describe("isApplicationClosed", () => {
  it("closes on the deadline and stays open before it", () => {
    expect(isApplicationClosed(event({ daysLeft: 0 }))).toBe(true)
    expect(isApplicationClosed(event({ daysLeft: -1 }))).toBe(true)
    expect(isApplicationClosed(event({ daysLeft: 1 }))).toBe(false)
  })
})

function event(fields) {
  return {
    isNew: false,
    daysLeft: 0,
    hoursLeft: 0,
    minutesLeft: 0,
    ...fields,
  }
}
