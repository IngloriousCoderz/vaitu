export function displayWebsite(value) {
  const clean = (value ?? "").trim()
  if (clean === "") return ""
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`
}
