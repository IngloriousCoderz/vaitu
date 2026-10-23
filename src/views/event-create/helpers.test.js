import { describe, expect, it } from "vitest"

import { droppedImageUrls } from "./helpers.js"

describe("droppedImageUrls", () => {
  it("lists only the saved photos the edit took out", () => {
    expect(droppedImageUrls(["a", "b", "c"], ["c", "new", "a"])).toEqual(["b"])
  })

  it("drops nothing for a new event or a missing list", () => {
    expect(droppedImageUrls([], ["new"])).toEqual([])
    expect(droppedImageUrls(undefined, undefined)).toEqual([])
  })
})
