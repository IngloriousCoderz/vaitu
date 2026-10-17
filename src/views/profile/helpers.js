import {
  FIRST_INDEX,
  LAST_INDEX_OFFSET,
  SINGULAR,
} from "../../constants/index.js"

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
