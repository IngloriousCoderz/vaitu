import { beforeAll, describe, expect, it } from "vitest"

import {
  BADGE_GENEROUS_MIN_HANDOFFS,
  BADGE_PAYMENT_ISSUES_MIN,
  BADGE_RELIABLE_MIN_JOBS,
  BADGE_SERIAL_APPLICANT_MIN_APPLICATIONS,
  BADGE_SERIAL_WITHDRAWER_MIN_PERCENT,
  BADGE_SERIAL_WITHDRAWER_MIN_WITHDRAWALS,
  BADGE_TOP_RATED_MIN_REVIEWS,
  BADGE_TOP_RATED_MIN_TENTHS,
  BADGE_UNRELIABLE_MIN_FAILURES,
  PERCENT_MAX,
  POINTS_PER_COMPLETED_JOB,
  POINTS_PER_DROPOUT,
  POINTS_PER_GOOD_REVIEW,
  POINTS_PER_NO_SHOW,
  POINTS_PER_PAYMENT_ISSUE,
  POINTS_PER_POOR_REVIEW,
  REVIEW_GOOD_MIN_STARS,
  REVIEW_POOR_MAX_STARS,
  TIER_BRONZE_MIN_POINTS,
  TIER_GOLD_MIN_POINTS,
  TIER_SILVER_MIN_POINTS,
} from "../constants/index.js"
import { ready } from "../i18n/index.js"
import {
  defaultTiers,
  progressLabel,
  tierProgress,
  tiersFromConfig,
} from "./tiers.js"

const TIERS = defaultTiers()

describe("defaultTiers", () => {
  it("uses the fallback thresholds and point values", () => {
    expect(TIERS).toEqual({
      bronzeMin: TIER_BRONZE_MIN_POINTS,
      silverMin: TIER_SILVER_MIN_POINTS,
      goldMin: TIER_GOLD_MIN_POINTS,
      perCompletedJob: POINTS_PER_COMPLETED_JOB,
      perGoodReview: POINTS_PER_GOOD_REVIEW,
      perPoorReview: POINTS_PER_POOR_REVIEW,
      perDropout: POINTS_PER_DROPOUT,
      perNoShow: POINTS_PER_NO_SHOW,
      perPaymentIssue: POINTS_PER_PAYMENT_ISSUE,
      paymentIssuesMin: BADGE_PAYMENT_ISSUES_MIN,
      goodReviewMinStars: REVIEW_GOOD_MIN_STARS,
      poorReviewMaxStars: REVIEW_POOR_MAX_STARS,
      serialApplicantMinApplications: BADGE_SERIAL_APPLICANT_MIN_APPLICATIONS,
      serialWithdrawerMinWithdrawals: BADGE_SERIAL_WITHDRAWER_MIN_WITHDRAWALS,
      serialWithdrawerMinPercent: BADGE_SERIAL_WITHDRAWER_MIN_PERCENT,
      unreliableMinFailures: BADGE_UNRELIABLE_MIN_FAILURES,
      reliableMinJobs: BADGE_RELIABLE_MIN_JOBS,
      topRatedMinReviews: BADGE_TOP_RATED_MIN_REVIEWS,
      topRatedMinTenths: BADGE_TOP_RATED_MIN_TENTHS,
      generousMinHandoffs: BADGE_GENEROUS_MIN_HANDOFFS,
    })
  })
})

describe("tiersFromConfig", () => {
  it("reads the stored values and falls back on the rest", () => {
    expect(
      tiersFromConfig([{ key: "tier_gold_min_points", value: 999 }]),
    ).toEqual({ ...TIERS, goldMin: 999 })
    expect(tiersFromConfig(null)).toEqual(TIERS)
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
      percent: 96,
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
    expect(tierProgress(TIERS.goldMin + TIERS.perCompletedJob, TIERS)).toEqual(
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
    expect(progressLabel(0, TIERS)).toBe("25 pts to Bronze")
    expect(progressLabel(TIERS.bronzeMin - 1, TIERS)).toBe("1 pt to Bronze")
    expect(progressLabel(TIERS.silverMin, TIERS)).toBe("150 pts to Gold")
  })

  it("stops counting once gold is reached", () => {
    expect(progressLabel(TIERS.goldMin, TIERS)).toBe("Max rank reached")
  })
})
