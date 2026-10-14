import { FIRST_INDEX } from "../../constants/index.js"
import { regions as english } from "./en.js"
import { regions as italian } from "./it.js"

function names(value) {
  return Array.isArray(value) ? value : [value]
}

const englishKeys = Object.keys(english)
const italianKeys = Object.keys(italian)

if (
  englishKeys.length !== italianKeys.length ||
  englishKeys.some((key) => !(key in italian))
) {
  throw new Error("Region translation files must use the same keys")
}

export const italianRegions = englishKeys
  .map((key) => names(english[key])[FIRST_INDEX])
  .sort((left, right) => left.localeCompare(right))

export const regionSpellings = englishKeys.flatMap((key) => {
  const canonical = names(english[key])[FIRST_INDEX]
  return [...names(english[key]), ...names(italian[key])].map((name) => ({
    name,
    canonical,
  }))
})
