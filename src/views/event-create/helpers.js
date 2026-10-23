// Saved photo URLs that were on the event before the edit and are gone after.
export function droppedImageUrls(before = [], after = []) {
  const kept = new Set(after)
  return before.filter((url) => !kept.has(url))
}
