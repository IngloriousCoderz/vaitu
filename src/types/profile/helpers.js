import {
  FIRST_INDEX,
  LAST_INDEX_OFFSET,
  PERCENT_MAX,
  POINTS_PER_APPLICATION,
  POINTS_PER_SELECTION,
  POINTS_PER_SHORTLIST,
  SINGULAR,
  TIER_BRONZE_MIN_POINTS,
  TIER_GOLD_MIN_POINTS,
  TIER_SILVER_MIN_POINTS,
  ZERO,
} from "../../constants/index.js"
import { capitalize } from "../../text/index.js"

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
  if (!progress.nextMin) return "Max rank reached"
  const earned = points ?? ZERO
  const missing = progress.nextMin - earned
  return `${missing} pts to ${capitalize(progress.next)}`
}

export function initials(name) {
  const words = (name ?? "").split(" ").filter(Boolean)
  if (words.length <= SINGULAR)
    return (words.at(FIRST_INDEX)?.at(FIRST_INDEX) ?? "?").toUpperCase()
  return `${words.at(FIRST_INDEX)?.at(FIRST_INDEX)}${words.at(words.length - LAST_INDEX_OFFSET)?.at(FIRST_INDEX)}`.toUpperCase()
}

export function displayWebsite(value) {
  const clean = (value ?? "").trim()
  if (clean === "") return ""
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`
}

export function displayInstagram(value) {
  const clean = (value ?? "").trim().replace(/^@+/, "")
  if (clean === "") return ""
  return `@${clean}`
}

export function instagramUrl(value) {
  const clean = (value ?? "").trim().replace(/^@+/, "")
  if (clean === "") return null
  return `https://instagram.com/${clean}`
}

export function isProfileComplete(profile) {
  if (!profile) return false
  return Boolean(
    profile.full_name?.trim() &&
    profile.website?.trim() &&
    profile.instagram_handle?.trim(),
  )
}
