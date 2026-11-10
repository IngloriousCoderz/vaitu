import { DEFAULT_CURRENCY } from "../../data/currencies.js"

/**
 * The form's details with what the voice message said on top. Only the fields
 * this job has, and only values it allows.
 * @param {{
 *   createFields: { field: string, options?: { value: string }[] }[],
 *   details?: { id: string, options: { value: string }[] }[],
 * }} form
 * @param {Record<string, string | string[]>} current
 * @param {Record<string, unknown>} [parsed]
 */
export function mergeParsedDetails(
  { createFields, details = [] },
  current,
  parsed = {},
) {
  const merged = { ...current }
  for (const { field, options } of createFields) {
    const value = parsed[field]
    if (typeof value !== "string" || !value.trim()) continue
    if (options && !options.some((option) => option.value === value)) continue
    merged[field] = value.trim()
  }
  for (const { id, options } of details) {
    const picked = allowed(options, [parsed[id]].flat())
    if (picked.length) merged[id] = picked
  }
  return merged
}

export function payFromForm(values) {
  return {
    kind: values.pay_kind,
    amount_min: toAmount(values.pay_min),
    amount_max: toAmount(values.pay_max),
    currency: values.pay_currency,
  }
}

export function payToForm(pay) {
  return {
    pay_kind: pay?.kind ?? "to_agree",
    pay_min: pay?.amount_min ?? "",
    pay_max: pay?.amount_max ?? "",
    pay_currency: pay?.currency ?? DEFAULT_CURRENCY,
  }
}

function allowed(options, values) {
  const picked = values.filter((value) =>
    options.some((option) => option.value === value),
  )
  return [...new Set(picked)]
}

function toAmount(value) {
  return value === "" || value == null ? undefined : Number(value)
}

export function droppedImageUrls(before = [], after = []) {
  const kept = new Set(after)
  return before.filter((url) => !kept.has(url))
}
