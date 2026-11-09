import { describe, expect, it } from "vitest"

import {
  GOOD_REVIEW_MIN_STARS,
  POINTS,
  POOR_REVIEW_MAX_STARS,
  TIERS,
} from "../../landing/src/points.js"
import { defaultTiers } from "./tiers.js"

describe("the landing page's points", () => {
  it("are the app's", () => {
    const tiers = defaultTiers()
    expect(POINTS).toEqual({
      perCompletedJob: tiers.perCompletedJob,
      perGoodReview: tiers.perGoodReview,
      perPoorReview: tiers.perPoorReview,
      perDropout: tiers.perDropout,
      perNoShow: tiers.perNoShow,
      perPaymentIssue: tiers.perPaymentIssue,
    })
    expect(GOOD_REVIEW_MIN_STARS).toBe(tiers.goodReviewMinStars)
    expect(POOR_REVIEW_MAX_STARS).toBe(tiers.poorReviewMaxStars)
    expect(TIERS).toEqual({
      bronze: tiers.bronzeMin,
      silver: tiers.silverMin,
      gold: tiers.goldMin,
    })
  })
})
