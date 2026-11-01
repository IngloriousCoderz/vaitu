import {
  DATE_ISO_LENGTH,
  FIRST_INDEX,
  NO_RATING,
} from "../../constants/index.js"

export function emptyReview() {
  return {
    outcome: "completed",
    rating: NO_RATING,
    comment: "",
    status: "idle",
    error: null,
  }
}

export function isReviewDue(item, eventDate) {
  if (item.status !== "selected" || item.job_reviews) return false
  const today = new Date().toISOString().slice(FIRST_INDEX, DATE_ISO_LENGTH)
  return eventDate <= today
}
