import { beforeAll, describe, expect, it } from "vitest"

import {
  PERCENT_MAX,
  POINTS_PER_APPLICATION,
  POINTS_PER_SELECTION,
  POINTS_PER_SHORTLIST,
  TIER_BRONZE_MIN_POINTS,
  TIER_GOLD_MIN_POINTS,
  TIER_SILVER_MIN_POINTS,
} from "../constants/index.js"
import { ready } from "../i18n/index.js"
import { defaultTiers, progressLabel, tierProgress } from "./tiers.js"

const TIERS = defaultTiers()

describe("defaultTiers", () => {
  it("uses the fallback thresholds and point values", () => {
    expect(TIERS).toEqual({
      bronzeMin: TIER_BRONZE_MIN_POINTS,
      silverMin: TIER_SILVER_MIN_POINTS,
      goldMin: TIER_GOLD_MIN_POINTS,
      perApplication: POINTS_PER_APPLICATION,
      perShortlist: POINTS_PER_SHORTLIST,
      perSelection: POINTS_PER_SELECTION,
    })
  })
})

describe("tierProgress", () => {
  it("treats a missing score as zero, still climbing to bronze", () => {
    const none = {
      current: null,
      next: "bronze",
      nextMin: TIERS.bronzeMin,
      percent: 0,
    }
    expect(tierProgress(undefined, TIERS)).toEqual(none)
    expect(tierProgress(null, TIERS)).toEqual(none)
  })

  it("fills the bar up to the bronze line", () => {
    expect(tierProgress(TIERS.bronzeMin - 1, TIERS)).toMatchObject({
      current: null,
      next: "bronze",
      percent: 99,
    })
  })

  it("starts each rank at the bottom of the climb to the next", () => {
    expect(tierProgress(TIERS.bronzeMin, TIERS)).toEqual({
      current: "bronze",
      next: "silver",
      nextMin: TIERS.silverMin,
      percent: 0,
    })
    expect(tierProgress(TIERS.silverMin, TIERS)).toEqual({
      current: "silver",
      next: "gold",
      nextMin: TIERS.goldMin,
      percent: 0,
    })
  })

  it("measures progress inside the current rank", () => {
    const halfway = TIERS.bronzeMin + (TIERS.silverMin - TIERS.bronzeMin) / 2
    expect(tierProgress(halfway, TIERS).percent).toBe(PERCENT_MAX / 2)
  })

  it("caps gold with a full bar and nowhere left to climb", () => {
    const gold = {
      current: "gold",
      next: null,
      nextMin: null,
      percent: PERCENT_MAX,
    }
    expect(tierProgress(TIERS.goldMin, TIERS)).toEqual(gold)
    expect(tierProgress(TIERS.goldMin + TIERS.perSelection, TIERS)).toEqual(
      gold,
    )
  })

  it("reads the thresholds it is given", () => {
    const custom = { bronzeMin: 10, silverMin: 20, goldMin: 40 }
    expect(tierProgress(15, custom)).toEqual({
      current: "bronze",
      next: "silver",
      nextMin: 20,
      percent: 50,
    })
  })
})

describe("progressLabel", () => {
  beforeAll(() => ready)

  it("names the points still missing and the rank they reach", async () => {
    expect(progressLabel(0, TIERS)).toBe("75 pts to Bronze")
    expect(progressLabel(TIERS.bronzeMin - 1, TIERS)).toBe("1 pt to Bronze")
    expect(progressLabel(TIERS.silverMin, TIERS)).toBe("75 pts to Gold")
  })

  it("stops counting once gold is reached", () => {
    expect(progressLabel(TIERS.goldMin, TIERS)).toBe("Max rank reached")
  })
})
