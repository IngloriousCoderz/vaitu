import { PERCENT_MAX } from "../constants/index.js"
import { currentLocale, t } from "../i18n/index.js"

/**
 * @typedef {{
 *   kind: string,
 *   amount_min?: number | null,
 *   amount_max?: number | null,
 *   currency: string,
 *   fee_kind?: string,
 *   fee_amount?: number | null,
 * }} Pay
 */

export function formatAmount(amount, currency) {
  return new Intl.NumberFormat(currentLocale(), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * What the colleague earns: from the client as a substitute, from the poster
 * as an assistant.
 * @param {Pay | null} [pay]
 */
export function formatPay(pay) {
  if (!pay || pay.kind === "to_agree") return t("pay.toAgree")
  if (pay.kind === "unpaid") return t("pay.unpaid")
  if (pay.kind === "fixed") return formatAmount(pay.amount_min, pay.currency)
  return `${formatAmount(pay.amount_min, pay.currency)} – ${formatAmount(pay.amount_max, pay.currency)}`
}

/** @param {Pay | null} [pay] */
export function hasFee(pay) {
  return Boolean(pay?.fee_kind) && pay.fee_kind !== "none"
}

/**
 * The fee a substitute gives the poster, or null when there is none.
 * @param {Pay | null} [pay]
 */
export function formatFee(pay) {
  if (!hasFee(pay)) return null
  if (pay.fee_kind === "to_agree") return t("pay.toAgree")
  if (pay.fee_kind === "fixed")
    return formatAmount(pay.fee_amount, pay.currency)
  const percent = new Intl.NumberFormat(currentLocale(), {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(pay.fee_amount / PERCENT_MAX)
  return t("pay.feePercentOf", { percent })
}

/**
 * Whether any money passes between the poster and the winner: what the poster
 * pays an assistant, or the fee a substitute gives the poster.
 * @param {string} seeking
 * @param {Pay | null} [pay]
 */
export function hasDeal(seeking, pay) {
  return seeking === "assistant" ? pay?.kind !== "unpaid" : hasFee(pay)
}

/**
 * The amount to suggest when the poster records what they agreed, as text for
 * the input: empty when the job doesn't settle it.
 * @param {string} seeking
 * @param {Pay | null} [pay]
 */
export function suggestedDealAmount(seeking, pay) {
  if (seeking === "assistant") {
    return pay?.kind === "fixed" ? String(pay.amount_min) : ""
  }
  if (pay?.fee_kind === "fixed") return String(pay.fee_amount)
  if (pay?.fee_kind === "percent" && pay.kind === "fixed") {
    return String(Math.round((pay.amount_min * pay.fee_amount) / PERCENT_MAX))
  }
  return ""
}
