// Whether a profile carries enough to apply to an event. The event detail
// view needs it to decide whether to send someone off to complete it.

export function isProfileComplete(profile) {
  if (!profile) return false
  return Boolean(
    profile.full_name?.trim() &&
    profile.website?.trim() &&
    profile.instagram_handle?.trim(),
  )
}
