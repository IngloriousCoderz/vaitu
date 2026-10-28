import { describe, expect, it } from "vitest"

import { festivalGenres, weddingStyles } from "../../data/event-taxonomy.js"
import { categoryOfDetail, filterSections } from "./categories.js"

describe("filterSections", () => {
  it("offers every wedding style and every festival genre when no category is picked", () => {
    const [style, genre] = filterSections([])
    expect(style.category).toBe("wedding")
    expect(style.title).toBe("Wedding style")
    expect(style.options).toEqual(options(weddingStyles))
    expect(genre.category).toBe("festival")
    expect(genre.title).toBe("Festival genre")
    expect(genre.options).toEqual(options(festivalGenres))
  })

  it("offers only the sections of the picked categories", () => {
    expect(filterSections(["festival"]).map((s) => s.id)).toEqual(["genre"])
  })
})

describe("categoryOfDetail", () => {
  it("names the category a style or genre belongs to", () => {
    expect(categoryOfDetail("editorial")).toBe("wedding")
    expect(categoryOfDetail("techno")).toBe("festival")
    expect(categoryOfDetail("polka")).toBeNull()
  })
})

function options(list) {
  return list.map((option) => ({ id: option.value, label: option.label }))
}
