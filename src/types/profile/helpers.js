export function initials(name) {
  const words = (name ?? "").split(" ").filter(Boolean)
  if (words.length <= 1) return (words[0]?.[0] ?? "?").toUpperCase()
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
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
