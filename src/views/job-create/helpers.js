import { DEFAULT_CURRENCY } from "../../data/currencies.js"

/**
 * The form's details with what the voice message said on top. Only the fields
 * this setting has, and only values it allows.
 * @param {{ createFields: { field: string, type: string, options?: { value: string }[] }[] }} setting
 * @param {Record<string, string | string[]>} current
 * @param {Record<string, unknown>} [parsed]
 */
export function mergeParsedDetails(setting, current, parsed = {}) {
  const details = { ...current }
  for (const { field, type, options } of setting.createFields) {
    const value = parsed[field]
    if (type === "chips") {
      const picked = allowed(options, [value].flat())
      if (picked.length) details[field] = picked
      continue
    }
    if (typeof value !== "string" || !value.trim()) continue
    if (options && !options.some((option) => option.value === value)) continue
    details[field] = value.trim()
  }
  return details
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
