import { labelled } from "../../i18n/index.js"
import { italianRegions, regionSpellings } from "./index.js"

export { italianRegions }

export const ITALY = "Italy"

function regionKey(value) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
}

const aliasByKey = new Map(
  regionSpellings.map(({ name, canonical }) => [regionKey(name), canonical]),
)

/** App name for an Italian region. Toscana and Tuscany are both Tuscany. */
export function canonicalRegion(value) {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return ""
  const key = regionKey(trimmed)
  return (
    aliasByKey.get(key) ??
    italianRegions.find((region) => regionKey(region) === key) ??
    trimmed
  )
}

export function sameRegion(left, right) {
  const a = canonicalRegion(left)
  const b = canonicalRegion(right)
  if (!a || !b) return false
  return regionKey(a) === regionKey(b)
}

export function isItalianRegion(value) {
  return italianRegions.some((region) => sameRegion(region, value))
}

/** Keep a saved region unless Italy is selected and the name is not in the list. */
export function regionForCountry(country, region) {
  const current = region ?? ""
  if (country === ITALY && current) {
    return isItalianRegion(current) ? canonicalRegion(current) : ""
  }
  return current
}

/**
 * Leaving Italy drops a region that came from the Italian list.
 * Entering Italy drops a region that is not on that list.
 */
export function regionAfterCountryChange(previousCountry, nextCountry, region) {
  const current = region ?? ""
  if (nextCountry === ITALY) {
    return isItalianRegion(current) ? canonicalRegion(current) : ""
  }
  if (previousCountry === ITALY && isItalianRegion(current)) return ""
  return current
}

export function uniqueRegions(values) {
  const seen = new Set()
  const result = []
  for (const value of values) {
    const name = canonicalRegion(value)
    if (!name) continue
    const key = regionKey(name)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(name)
  }
  return result
}

/**
 * All regions, then My regions, then each favorite, then the other
 * regions that events already use.
 */
export function regionFilterItems(eventRegions, favoriteRegions) {
  const favorites = uniqueRegions(favoriteRegions)
  const others = uniqueRegions(eventRegions).filter(
    (region) => !favorites.some((favorite) => sameRegion(favorite, region)),
  )
  return [
    labelled("filters.allRegions", { id: "all" }),
    ...(favorites.length
      ? [labelled("filters.myRegions", { id: "mine" })]
      : []),
    ...favorites.map((region) => ({ id: region, label: region })),
    ...others.map((region) => ({ id: region, label: region })),
  ]
}

const ITALIAN_GROUP = "__group_italian"
const OTHER_GROUP = "__group_other"

function regionOption(region) {
  return { value: region, label: region }
}

function availableRegions(regions, taken) {
  return uniqueRegions(regions)
    .filter((region) => !taken.some((name) => sameRegion(name, region)))
    .sort((left, right) => left.localeCompare(right))
}

/**
 * Favorite combobox: Italian regions, then the other names already on events.
 * Group labels are not selectable.
 */
export function favoriteRegionOptions(eventRegions, taken = []) {
  const chosen = taken ?? []
  const italian = availableRegions(italianRegions, chosen)
  const others = availableRegions(eventRegions, chosen).filter(
    (region) => !isItalianRegion(region),
  )
  return [
    ...(italian.length
      ? [
          labelled("filters.italianRegions", {
            value: ITALIAN_GROUP,
            isDisabled: true,
          }),
          ...italian.map(regionOption),
        ]
      : []),
    ...(others.length
      ? [
          labelled("filters.otherRegions", {
            value: OTHER_GROUP,
            isDisabled: true,
          }),
          ...others.map(regionOption),
        ]
      : []),
  ]
}

export function activeRegionAfterChange(activeRegion, items) {
  if (items.some((item) => item.id === activeRegion)) return activeRegion
  const alias = items.find((item) => sameRegion(item.id, activeRegion))
  return alias ? alias.id : "all"
}
