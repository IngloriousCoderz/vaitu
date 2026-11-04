import { describe, expect, it } from "vitest"

import {
  droppedImageUrls,
  mergeParsedDetails,
  payFromForm,
  payToForm,
} from "./helpers.js"

describe("droppedImageUrls", () => {
  it("lists only the saved photos the edit took out", () => {
    expect(droppedImageUrls(["a", "b", "c"], ["c", "new", "a"])).toEqual(["b"])
  })

  it("drops nothing for a new job or a missing list", () => {
    expect(droppedImageUrls([], ["new"])).toEqual([])
    expect(droppedImageUrls(undefined, undefined)).toEqual([])
  })
})

describe("mergeParsedDetails", () => {
  const category = {
    createFields: [
      { field: "headliner" },
      { field: "genre", options: [{ value: "techno" }] },
    ],
  }

  it("fills the category's fields, over what the form had", () => {
    expect(
      mergeParsedDetails(
        category,
        { headliner: "Old" },
        { headliner: " Ada ", genre: "techno" },
      ),
    ).toEqual({ headliner: "Ada", genre: "techno" })
  })

  it("keeps what the form had when the message says nothing", () => {
    expect(
      mergeParsedDetails(category, { headliner: "Old" }, { headliner: null }),
    ).toEqual({ headliner: "Old" })
    expect(mergeParsedDetails(category, { headliner: "Old" })).toEqual({
      headliner: "Old",
    })
  })

  it("skips other categories' fields and values off the list", () => {
    expect(
      mergeParsedDetails(category, {}, { style: "film", genre: "polka" }),
    ).toEqual({})
  })
})

describe("the pay fields", () => {
  it("turn typed amounts into numbers, and empty ones into nothing", () => {
    expect(
      payFromForm({
        pay_kind: "range",
        pay_min: "300",
        pay_max: "",
        pay_currency: "EUR",
      }),
    ).toEqual({
      kind: "range",
      amount_min: 300,
      amount_max: undefined,
      currency: "EUR",
    })
  })

  it("start as to be agreed when the job has no pay yet", () => {
    expect(payToForm(null)).toEqual({
      pay_kind: "to_agree",
      pay_min: "",
      pay_max: "",
      pay_currency: "EUR",
    })
  })

  it("come back from a saved job", () => {
    expect(
      payToForm({
        kind: "fixed",
        amount_min: 500,
        amount_max: null,
        currency: "CHF",
      }),
    ).toEqual({
      pay_kind: "fixed",
      pay_min: 500,
      pay_max: "",
      pay_currency: "CHF",
    })
  })
})
