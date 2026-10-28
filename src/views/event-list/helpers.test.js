import { describe, expect, it } from "vitest"

import {
  activeFilters,
  defaultRegion,
  distinctRegions,
  regionInEffect,
  typesInScope,
} from "./helpers.js"

describe("typesInScope", () => {
  it("adds the category of each picked style or genre, once", () => {
    expect(typesInScope([], [])).toEqual([])
    expect(typesInScope([], ["techno", "jazz"])).toEqual(["festival"])
    expect(typesInScope(["wedding"], ["editorial"])).toEqual(["wedding"])
  })

  it("falls back to the profile's interests only while nothing is picked", () => {
    expect(typesInScope([], [], ["wedding"])).toEqual(["wedding"])
    expect(typesInScope(["festival"], [], ["wedding"])).toEqual(["festival"])
    expect(typesInScope([], ["techno"], ["wedding"])).toEqual(["festival"])
  })
})

describe("the default region", () => {
  it("is your favorites once you have some, and stands in while none is picked", () => {
    expect(defaultRegion([])).toBe("all")
    expect(defaultRegion(["Tuscany"])).toBe("mine")
    expect(regionInEffect(null, ["Tuscany"])).toBe("mine")
    expect(regionInEffect("Sicily", ["Tuscany"])).toBe("Sicily")
  })
})

describe("activeFilters", () => {
  const base = { types: [], details: [], region: null, period: "all" }
  const regions = [
    { id: "all", label: "All regions" },
    { id: "Sicily", label: "Sicily" },
  ]

  it("shows nothing for the defaults", () => {
    expect(activeFilters({ ...base, regions })).toEqual([])
  })

  it("lists what is on, in the sheet's order", () => {
    const active = activeFilters({
      types: ["festival"],
      details: ["techno"],
      region: "Sicily",
      period: "week",
      regions,
    })
    expect(active.map(({ kind, id }) => `${kind}:${id}`)).toEqual([
      "type:festival",
      "detail:techno",
      "region:Sicily",
      "period:week",
    ])
  })
})

describe("distinctRegions", () => {
  it("returns each region once, under the stored name, in alphabetical order", () => {
    expect(distinctRegions(["Tuscany", "Toscana", "", "Lombardia"])).toEqual([
      "Lombardy",
      "Tuscany",
    ])
  })
})
