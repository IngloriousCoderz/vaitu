export function isProfileComplete(profile) {
  if (!profile) return false
  return Boolean(
    profile.full_name?.trim() &&
    (profile.website?.trim() || profile.phone?.trim()),
  )
}

/** A website as people read it: no scheme, no "www.", no trailing slash. */
export function websiteLabel(url) {
  return (url ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "")
}

export function telUrl(phone) {
  const number = (phone ?? "").replace(/\s/g, "")
  return number ? `tel:${number}` : null
}

export function mailtoUrl(email, { subject, body }) {
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return `mailto:${email}?${query}`
}
