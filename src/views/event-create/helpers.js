/**
 * The form's details with what the voice message said on top. Only the fields
 * this category has, and only values it allows.
 * @param {{ createFields: { field: string, options?: { value: string }[] }[] }} category
 * @param {Record<string, string>} current
 * @param {Record<string, unknown>} [parsed]
 */
export function mergeParsedDetails(category, current, parsed = {}) {
  const details = { ...current }
  for (const { field, options } of category.createFields) {
    const value = parsed[field]
    if (typeof value !== "string" || !value.trim()) continue
    if (options && !options.some((option) => option.value === value)) continue
    details[field] = value.trim()
  }
  return details
}

export function droppedImageUrls(before = [], after = []) {
  const kept = new Set(after)
  return before.filter((url) => !kept.has(url))
}
