import { beforeAll, describe, expect, it } from "vitest"

import { JUST_OPENED_MIN_DAYS, SINGULAR, ZERO } from "../constants/index.js"
import { ready } from "../i18n/index.js"
import { countdownLabel, isApplicationClosed } from "./events.js"

function event(fields) {
  return {
    isNew: false,
    daysLeft: ZERO,
    hoursLeft: ZERO,
    minutesLeft: ZERO,
    ...fields,
  }
}

describe("countdownLabel", () => {
  beforeAll(() => ready)

  it("calls a new event just opened while more than two days remain", () => {
    expect(
      countdownLabel(
        event({ isNew: true, daysLeft: JUST_OPENED_MIN_DAYS + SINGULAR }),
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
    expect(countdownLabel(event({ daysLeft: SINGULAR, hoursLeft: 3 }))).toBe(
      "Applications close in 3 hours",
    )
    expect(countdownLabel(event({ hoursLeft: SINGULAR }))).toBe(
      "Applications close in 1 hour",
    )
    expect(countdownLabel(event({ minutesLeft: 3 }))).toBe(
      "Applications close in 3 minutes",
    )
    expect(countdownLabel(event({ minutesLeft: SINGULAR }))).toBe(
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
    expect(isApplicationClosed(event({ daysLeft: ZERO }))).toBe(true)
    expect(isApplicationClosed(event({ daysLeft: -1 }))).toBe(true)
    expect(isApplicationClosed(event({ daysLeft: SINGULAR }))).toBe(false)
  })
})
