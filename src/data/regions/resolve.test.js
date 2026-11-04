import { describe, expect, it } from "vitest"

import {
  activeRegionAfterChange,
  canonicalRegion,
  favoriteRegionOptions,
  isItalianRegion,
  regionAfterCountryChange,
  regionFilterItems,
  regionForCountry,
  regionOption,
  sameRegion,
  uniqueRegions,
} from "./resolve.js"

describe("canonicalRegion", () => {
  it("turns Italian and English spellings into the name the app stores", () => {
    expect(canonicalRegion("Toscana")).toBe("Tuscany")
    expect(canonicalRegion("  tuscany ")).toBe("Tuscany")
    expect(canonicalRegion("Lombardia")).toBe("Lombardy")
    expect(canonicalRegion("Valle d'Aosta")).toBe("Aosta Valley")
    expect(canonicalRegion("Valle d’Aosta")).toBe("Aosta Valley")
    expect(canonicalRegion("Emilia Romagna")).toBe("Emilia-Romagna")
    expect(canonicalRegion("Apulia")).toBe("Puglia")
    expect(canonicalRegion("Trentino-South Tyrol")).toBe("Trentino-Alto Adige")
  })

  it("keeps a name that is not on the Italian list, and drops a blank", () => {
    expect(canonicalRegion("  Provence ")).toBe("Provence")
    expect(canonicalRegion("")).toBe("")
    expect(canonicalRegion(null)).toBe("")
  })
})

describe("sameRegion", () => {
  it("matches spellings of one region and rejects a blank", () => {
    expect(sameRegion("Toscana", "Tuscany")).toBe(true)
    expect(sameRegion("Provence", "Tuscany")).toBe(false)
    expect(sameRegion("", "Tuscany")).toBe(false)
  })
})

describe("isItalianRegion", () => {
  it("recognises a spelling of a listed region", () => {
    expect(isItalianRegion("Toscana")).toBe(true)
    expect(isItalianRegion("Provence")).toBe(false)
  })
})

describe("regionForCountry", () => {
  it("canonicalises an Italian region and clears one Italy does not list", () => {
    expect(regionForCountry("Italy", "Toscana")).toBe("Tuscany")
    expect(regionForCountry("Italy", "Provence")).toBe("")
    expect(regionForCountry("Italy", "")).toBe("")
  })

  it("leaves the saved text alone for any other country", () => {
    expect(regionForCountry("France", "Toscana")).toBe("Toscana")
  })
})

describe("regionAfterCountryChange", () => {
  it("drops a foreign region on the way into Italy and keeps an Italian one", () => {
    expect(regionAfterCountryChange("France", "Italy", "Provence")).toBe("")
    expect(regionAfterCountryChange("France", "Italy", "Toscana")).toBe(
      "Tuscany",
    )
  })

  it("drops an Italian region on the way out and keeps a foreign one", () => {
    expect(regionAfterCountryChange("Italy", "France", "Tuscany")).toBe("")
    expect(regionAfterCountryChange("Italy", "France", "Provence")).toBe(
      "Provence",
    )
    expect(regionAfterCountryChange("France", "Spain", "Provence")).toBe(
      "Provence",
    )
  })
})

describe("uniqueRegions", () => {
  it("keeps the first spelling of each region and skips blanks", () => {
    expect(
      uniqueRegions(["Toscana", "Tuscany", "", "Provence", " provence "]),
    ).toEqual(["Tuscany", "Provence"])
  })
})

describe("regionFilterItems", () => {
  it("lists every job region when there are no favorites", () => {
    const items = regionFilterItems(["Tuscany", "Toscana", "Provence"], [])
    expect(items.map((item) => item.id)).toEqual(["all", "Tuscany", "Provence"])
    expect(items[0].label).toBe("filters.allRegions")
  })

  it("puts my regions first, then favorites, without repeating them among the others", () => {
    const items = regionFilterItems(["Provence", "Tuscany"], ["Toscana"])
    expect(items.map((item) => ({ id: item.id, label: item.label }))).toEqual([
      { id: "mine", label: "filters.myRegions" },
      { id: "all", label: "filters.allRegions" },
      { id: "Tuscany", label: "Tuscany" },
      { id: "Provence", label: "Provence" },
    ])
  })
})

describe("regionOption", () => {
  it("is found under its spellings, typed with or without punctuation", () => {
    expect(regionOption("Tuscany").keywords).toContain("Toscana")
    expect(regionOption("Emilia-Romagna").keywords).toContain("emilia romagna")
    expect(regionOption("Provence")).toEqual({
      value: "Provence",
      label: "Provence",
    })
  })
})

describe("favoriteRegionOptions", () => {
  it("groups the Italian list, then names already used on jobs", () => {
    const [italian, other] = favoriteRegionOptions(["Provence", "Toscana"])
    expect(italian.label).toBe("filters.italianRegions")
    const values = italian.options.map((option) => option.value)
    expect(values).toContain("Tuscany")
    expect(values).not.toContain("Toscana")
    expect(other).toEqual({
      label: "filters.otherRegions",
      options: [{ value: "Provence", label: "Provence" }],
    })
  })

  it("lists a favorite no job uses, in the spelling it was saved with", () => {
    const [, other] = favoriteRegionOptions(
      ["Provence"],
      ["bavaria", "provence"],
    )
    expect(other.options.map((option) => option.value)).toEqual([
      "bavaria",
      "provence",
    ])
  })

  it("leaves out the other group when every name is Italian", () => {
    expect(favoriteRegionOptions(["Toscana"])).toHaveLength(1)
  })
})

describe("activeRegionAfterChange", () => {
  it("keeps the current choice, or its stored spelling, and falls back to all", () => {
    const items = [{ id: "all" }, { id: "Tuscany" }, { id: "Provence" }]
    expect(activeRegionAfterChange("Provence", items)).toBe("Provence")
    expect(activeRegionAfterChange("Toscana", items)).toBe("Tuscany")
    expect(activeRegionAfterChange("Lombardy", items)).toBe("all")
  })
})
