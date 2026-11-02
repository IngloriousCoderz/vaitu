import { describe, expect, it } from "vitest"

import { countries } from "./countries.js"
import {
  CURRENCIES,
  currencyAfterCountryChange,
  currencyOf,
} from "./currencies.js"

describe("currencyOf", () => {
  it("knows a listed currency for every country", () => {
    for (const country of countries) {
      expect(CURRENCIES).toContain(currencyOf(country))
    }
    expect(currencyOf("Australia")).toBe("AUD")
    expect(currencyOf("Italy")).toBe("EUR")
  })
})

describe("currencyAfterCountryChange", () => {
  it("follows the country until the poster picks another currency", () => {
    expect(currencyAfterCountryChange("", "Australia", "EUR")).toBe("AUD")
    expect(currencyAfterCountryChange("Australia", "Japan", "AUD")).toBe("JPY")
    expect(currencyAfterCountryChange("Australia", "Japan", "USD")).toBe("USD")
  })
})
