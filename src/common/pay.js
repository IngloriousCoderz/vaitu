import { currentLocale, t } from "../i18n/index.js"

export function formatAmount(amount, currency) {
  return new Intl.NumberFormat(currentLocale(), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** @param {{ kind: string } | null} [pay] */
export function isUnpaid(pay) {
  return pay?.kind === "unpaid"
}

/** @param {{ kind: string, amount_min?: number, amount_max?: number, currency: string }} [pay] */
export function formatPay(pay) {
  if (!pay || pay.kind === "to_agree") return t("pay.toAgree")
  if (isUnpaid(pay)) return t("pay.unpaid")
  if (pay.kind === "fixed") return formatAmount(pay.amount_min, pay.currency)
  return `${formatAmount(pay.amount_min, pay.currency)} – ${formatAmount(pay.amount_max, pay.currency)}`
}
