// Rank thresholds and progress. The tiers table is configuration rather than
// view state, so both the profile and the ranks view read it from here.
import {
  PERCENT_MAX,
  POINTS_PER_APPLICATION,
  POINTS_PER_SELECTION,
  POINTS_PER_SHORTLIST,
  TIER_BRONZE_MIN_POINTS,
  TIER_GOLD_MIN_POINTS,
  TIER_SILVER_MIN_POINTS,
  ZERO,
} from "../constants/index.js"
import { t } from "../i18n/index.js"

export function defaultTiers() {
  return {
    bronzeMin: TIER_BRONZE_MIN_POINTS,
    silverMin: TIER_SILVER_MIN_POINTS,
    goldMin: TIER_GOLD_MIN_POINTS,
    perApplication: POINTS_PER_APPLICATION,
    perShortlist: POINTS_PER_SHORTLIST,
    perSelection: POINTS_PER_SELECTION,
  }
}

export function tierProgress(points, tiers) {
  const earned = points ?? ZERO
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
  const earned = points ?? ZERO
  const missing = progress.nextMin - earned
  return t("ranks.toNext", {
    points: t("ranks.points", { count: missing }),
    tier: t(`ranks.tier.${progress.next}`),
  })
}
