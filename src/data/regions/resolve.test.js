import { describe, expect, it } from "vitest"

import {
  activeRegionAfterChange,
  canonicalRegion,
  favoriteRegionOptions,
  isItalianRegion,
  regionAfterCountryChange,
  regionFilterItems,
  regionForCountry,
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
  it("lists every event region when there are no favorites", () => {
    const items = regionFilterItems(["Tuscany", "Toscana", "Provence"], [])
    expect(items.map((item) => item.id)).toEqual(["all", "Tuscany", "Provence"])
    expect(items[0].label).toBe("All regions")
  })

  it("puts my regions first, then favorites, without repeating them among the others", () => {
    const items = regionFilterItems(["Provence", "Tuscany"], ["Toscana"])
    expect(items.map((item) => ({ id: item.id, label: item.label }))).toEqual([
      { id: "mine", label: "My regions" },
      { id: "all", label: "All regions" },
      { id: "Tuscany", label: "Tuscany" },
      { id: "Provence", label: "Provence" },
    ])
  })
})

describe("favoriteRegionOptions", () => {
  it("groups the Italian list, then names already used on events", () => {
    const options = favoriteRegionOptions(["Provence", "Toscana"])
    expect(options[0]).toMatchObject({
      value: "__group_italian",
      label: "Italian regions",
      isDisabled: true,
    })
    expect(options.some((option) => option.value === "Tuscany")).toBe(true)
    expect(options.some((option) => option.value === "Toscana")).toBe(false)
    const other = options.find((option) => option.value === "__group_other")
    expect(other).toMatchObject({
      label: "Other regions",
      isDisabled: true,
    })
    expect(options.at(-1)).toEqual({ value: "Provence", label: "Provence" })
  })

  it("hides a region that is already chosen, including under another spelling", () => {
    const options = favoriteRegionOptions(["Provence"], ["Toscana"])
    expect(options.some((option) => option.value === "Tuscany")).toBe(false)
    expect(options.some((option) => option.value === "Provence")).toBe(true)
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
