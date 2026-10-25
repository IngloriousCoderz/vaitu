import { describe, expect, it } from "vitest"

import { festivalGenres, weddingStyles } from "../../data/event-taxonomy.js"
import { filtersForCategory } from "./categories.js"

describe("filtersForCategory", () => {
  it("offers every wedding style, with a chip that shows them all", () => {
    const wedding = chips("wedding")
    expect(wedding[0]).toEqual({ id: "all", label: "All Styles" })
    expect(wedding.slice(1)).toEqual(
      weddingStyles.map((style) => ({ id: style.value, label: style.label })),
    )
  })

  it("offers every festival genre", () => {
    const festival = chips("festival")
    expect(festival[0]).toEqual({ id: "all", label: "All Genres" })
    expect(festival.slice(1)).toEqual(
      festivalGenres.map((genre) => ({
        id: genre.value,
        label: genre.label,
      })),
    )
  })

  it("uses the wedding styles for a category it does not know", () => {
    expect(chips("reunion").map((chip) => chip.id)).toEqual(
      chips("wedding").map((chip) => chip.id),
    )
  })
})

function chips(categoryId) {
  return filtersForCategory(categoryId).map((chip) => ({
    id: chip.id,
    label: chip.label,
  }))
}
