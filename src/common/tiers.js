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
  NO_POINTS,
  PERCENT_MAX,
  POINTS_PER_COMPLETED_HANDOFF,
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
import { t } from "../i18n/index.js"

export function defaultTiers() {
  return {
    bronzeMin: TIER_BRONZE_MIN_POINTS,
    silverMin: TIER_SILVER_MIN_POINTS,
    goldMin: TIER_GOLD_MIN_POINTS,
    perCompletedJob: POINTS_PER_COMPLETED_JOB,
    perCompletedHandoff: POINTS_PER_COMPLETED_HANDOFF,
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
  }
}

export function tiersFromConfig(rows) {
  const byKey = Object.fromEntries(
    (rows ?? []).map((row) => [row.key, row.value]),
  )
  const defaults = defaultTiers()
  return {
    bronzeMin: byKey.tier_bronze_min_points ?? defaults.bronzeMin,
    silverMin: byKey.tier_silver_min_points ?? defaults.silverMin,
    goldMin: byKey.tier_gold_min_points ?? defaults.goldMin,
    perCompletedJob: byKey.points_per_completed_job ?? defaults.perCompletedJob,
    perCompletedHandoff:
      byKey.points_per_completed_handoff ?? defaults.perCompletedHandoff,
    perGoodReview: byKey.points_per_good_review ?? defaults.perGoodReview,
    perPoorReview: byKey.points_per_poor_review ?? defaults.perPoorReview,
    perDropout: byKey.points_per_dropout ?? defaults.perDropout,
    perNoShow: byKey.points_per_no_show ?? defaults.perNoShow,
    perPaymentIssue: byKey.points_per_payment_issue ?? defaults.perPaymentIssue,
    paymentIssuesMin:
      byKey.badge_payment_issues_min ?? defaults.paymentIssuesMin,
    goodReviewMinStars:
      byKey.review_good_min_stars ?? defaults.goodReviewMinStars,
    poorReviewMaxStars:
      byKey.review_poor_max_stars ?? defaults.poorReviewMaxStars,
    serialApplicantMinApplications:
      byKey.badge_serial_applicant_min_applications ??
      defaults.serialApplicantMinApplications,
    serialWithdrawerMinWithdrawals:
      byKey.badge_serial_withdrawer_min_withdrawals ??
      defaults.serialWithdrawerMinWithdrawals,
    serialWithdrawerMinPercent:
      byKey.badge_serial_withdrawer_min_percent ??
      defaults.serialWithdrawerMinPercent,
    unreliableMinFailures:
      byKey.badge_unreliable_min_failures ?? defaults.unreliableMinFailures,
    reliableMinJobs: byKey.badge_reliable_min_jobs ?? defaults.reliableMinJobs,
    topRatedMinReviews:
      byKey.badge_top_rated_min_reviews ?? defaults.topRatedMinReviews,
    topRatedMinTenths:
      byKey.badge_top_rated_min_tenths ?? defaults.topRatedMinTenths,
    generousMinHandoffs:
      byKey.badge_generous_min_handoffs ?? defaults.generousMinHandoffs,
  }
}

export function tierProgress(points, tiers) {
  const earned = points ?? NO_POINTS
  if (earned >= tiers.goldMin)
    return { current: "gold", next: null, nextMin: null, percent: PERCENT_MAX }
  if (earned >= tiers.silverMin)
    return {
      current: "silver",
      next: "gold",
      nextMin: tiers.goldMin,
      percent: Math.round(
        ((earned - tiers.silverMin) / (tiers.goldMin - tiers.silverMin)) *
          PERCENT_MAX,
      ),
    }
  if (earned >= tiers.bronzeMin)
    return {
      current: "bronze",
      next: "silver",
      nextMin: tiers.silverMin,
      percent: Math.round(
        ((earned - tiers.bronzeMin) / (tiers.silverMin - tiers.bronzeMin)) *
          PERCENT_MAX,
      ),
    }
  return {
    current: null,
    next: "bronze",
    nextMin: tiers.bronzeMin,
    percent: Math.round((earned / tiers.bronzeMin) * PERCENT_MAX),
  }
}

export function progressLabel(points, tiers) {
  const progress = tierProgress(points, tiers)
  if (!progress.nextMin) return t("ranks.maxReached")
  const earned = points ?? NO_POINTS
  const missing = progress.nextMin - earned
  return t("ranks.toNext", {
    points: t("ranks.points", { count: missing }),
    tier: t(`ranks.tier.${progress.next}`),
  })
}
