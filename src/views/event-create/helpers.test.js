import { describe, expect, it } from "vitest"

import { droppedImageUrls, mergeParsedDetails } from "./helpers.js"

describe("droppedImageUrls", () => {
  it("lists only the saved photos the edit took out", () => {
    expect(droppedImageUrls(["a", "b", "c"], ["c", "new", "a"])).toEqual(["b"])
  })

  it("drops nothing for a new event or a missing list", () => {
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
