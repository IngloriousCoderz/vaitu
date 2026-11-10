// The app's defaults, from src/constants: src/common/landing-points.test.js
// fails when they part.
export const POINTS = {
  perCompletedJob: 20,
  perCompletedHandoff: 10,
  perGoodReview: 5,
  perPoorReview: -10,
  perDropout: -15,
  perNoShow: -30,
  perPaymentIssue: -20,
}

export const GOOD_REVIEW_MIN_STARS = 4
export const POOR_REVIEW_MAX_STARS = 2

export const TIERS = { bronze: 25, silver: 100, gold: 250 }

const NO_POINTS = 0
const PLACEHOLDER = /\{\{(\w+)\}\}/g

export function fill(text, values) {
  return text.replace(PLACEHOLDER, (match, key) => String(values[key] ?? match))
}

export function signed(points) {
  return points > NO_POINTS ? `+${points}` : `−${Math.abs(points)}`
}
