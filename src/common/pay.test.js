import { beforeAll, describe, expect, it } from "vitest"

import { ready } from "../i18n/index.js"
import { formatFee, formatPay, hasDeal, suggestedDealAmount } from "./pay.js"

describe("formatPay", () => {
  beforeAll(() => ready)

  it("shows one amount or a range", () => {
    expect(
      formatPay({ kind: "fixed", amount_min: 500, currency: "EUR" }),
    ).toContain("500")
    const range = formatPay({
      kind: "range",
      amount_min: 300,
      amount_max: 400,
      currency: "EUR",
    })
    expect(range).toContain("300")
    expect(range).toContain("400")
  })

  it("says it's to be agreed when there is no amount", () => {
    expect(formatPay({ kind: "to_agree", currency: "EUR" })).toBe(
      "To be agreed",
    )
    expect(formatPay(null)).toBe("To be agreed")
  })

  it("says when a job is unpaid", () => {
    expect(formatPay({ kind: "unpaid", currency: "EUR" })).toBe("Unpaid")
  })
})

describe("what passes between poster and winner", () => {
  beforeAll(() => ready)

  const fixed = { kind: "fixed", amount_min: 2000, currency: "EUR" }

  it("is what the poster pays an assistant, unless the job is unpaid", () => {
    expect(hasDeal("assistant", fixed)).toBe(true)
    expect(hasDeal("assistant", { kind: "unpaid", currency: "EUR" })).toBe(
      false,
    )
    expect(suggestedDealAmount("assistant", fixed)).toBe("2000")
  })

  it("is the fee a substitute gives the poster, when there is one", () => {
    expect(hasDeal("substitute", fixed)).toBe(false)
    expect(hasDeal("substitute", { ...fixed, fee_kind: "none" })).toBe(false)
    expect(hasDeal("substitute", { ...fixed, fee_kind: "to_agree" })).toBe(true)
    expect(
      suggestedDealAmount("substitute", {
        ...fixed,
        fee_kind: "fixed",
        fee_amount: 300,
      }),
    ).toBe("300")
    expect(
      suggestedDealAmount("substitute", {
        ...fixed,
        fee_kind: "percent",
        fee_amount: 15,
      }),
    ).toBe("300")
    expect(
      suggestedDealAmount("substitute", {
        kind: "to_agree",
        currency: "EUR",
        fee_kind: "percent",
        fee_amount: 15,
      }),
    ).toBe("")
  })

  it("shows a fee as an amount or a share of what the client pays", () => {
    expect(formatFee(fixed)).toBeNull()
    expect(
      formatFee({ ...fixed, fee_kind: "fixed", fee_amount: 300 }),
    ).toContain("300")
    expect(formatFee({ ...fixed, fee_kind: "percent", fee_amount: 15 })).toBe(
      "15% of what the client pays",
    )
  })
})
