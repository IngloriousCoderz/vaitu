export function isProfileComplete(profile) {
  if (!profile) return false
  return Boolean(
    profile.full_name?.trim() &&
    (profile.website?.trim() || profile.phone?.trim()),
  )
}

export function telUrl(phone) {
  const number = (phone ?? "").replace(/\s/g, "")
  return number ? `tel:${number}` : null
}

export function mailtoUrl(email, { subject, body }) {
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return `mailto:${email}?${query}`
}
