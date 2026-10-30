export function droppedImageUrls(before = [], after = []) {
  const kept = new Set(after)
  return before.filter((url) => !kept.has(url))
}
