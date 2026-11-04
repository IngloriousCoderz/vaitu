import { italianRegions, regionSpellings } from "./index.js"

const aliasByKey = new Map(
  regionSpellings.map(({ name, canonical }) => [regionKey(name), canonical]),
)

export { italianRegions }

export const ITALY = "Italy"

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
 * regions that jobs already use.
 */
export function regionFilterItems(jobRegions, favoriteRegions) {
  const favorites = uniqueRegions(favoriteRegions)
  const others = uniqueRegions(jobRegions).filter(
    (region) => !favorites.some((favorite) => sameRegion(favorite, region)),
  )
  return [
    ...(favorites.length ? [{ id: "mine", label: "filters.myRegions" }] : []),
    { id: "all", label: "filters.allRegions" },
    ...favorites.map((region) => ({ id: region, label: region })),
    ...others.map((region) => ({ id: region, label: region })),
  ]
}

/**
 * Favorite combobox: Italian regions, then the favorites and other names already
 * on jobs, each under its heading.
 */
export function favoriteRegionOptions(jobRegions, favorites = []) {
  const others = sortedRegions([...favorites, ...jobRegions]).filter(
    (region) => !isItalianRegion(region),
  )
  return [
    {
      label: "filters.italianRegions",
      options: sortedRegions(italianRegions).map(regionOption),
    },
    ...(others.length
      ? [{ label: "filters.otherRegions", options: others.map(regionOption) }]
      : []),
  ]
}

export function activeRegionAfterChange(activeRegion, items) {
  if (items.some((item) => item.id === activeRegion)) return activeRegion
  const alias = items.find((item) => sameRegion(item.id, activeRegion))
  return alias ? alias.id : "all"
}

function regionKey(value) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
}

/** A region option, found by search under any of its spellings. */
export function regionOption(region) {
  const spellings = regionSpellings
    .filter(({ canonical }) => canonical === region)
    .flatMap(({ name }) => [name, regionKey(name)])
  return {
    value: region,
    label: region,
    ...(spellings.length ? { keywords: spellings } : {}),
  }
}

function sortedRegions(regions) {
  return uniqueRegions(regions).sort((left, right) => left.localeCompare(right))
}
