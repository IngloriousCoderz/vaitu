export function isProfileComplete(profile) {
  if (!profile) return false
  return Boolean(
    profile.full_name?.trim() &&
    profile.website?.trim() &&
    profile.instagram_handle?.trim(),
  )
}
