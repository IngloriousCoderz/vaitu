import { beforeAll, describe, expect, it } from "vitest"

import { ready } from "../i18n/index.js"
import { formatPay } from "./pay.js"

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
