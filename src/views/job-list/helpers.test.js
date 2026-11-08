import { describe, expect, it } from "vitest"

import { availableJobTypes } from "../../data/job-taxonomy.js"
import {
  activeFilters,
  defaultRegion,
  distinctRegions,
  jobTypesInScope,
  regionInEffect,
} from "./helpers.js"

describe("jobTypesInScope", () => {
  const everything = availableJobTypes.map((jobType) => jobType.id)

  it("adds the job types of each picked style", () => {
    expect(jobTypesInScope([], [], [], [])).toEqual(everything)
    expect(jobTypesInScope([], ["editorial"], [], ["dj"])).toEqual([
      "wedding_dj",
    ])
    expect(jobTypesInScope([], ["editorial"], [], [])).not.toContain(
      "wedding_planner",
    )
  })

  it("falls back to the interests only while nothing is picked", () => {
    const interests = ["wedding_dj"]
    expect(jobTypesInScope([], [], interests, [])).toEqual(interests)
    expect(
      jobTypesInScope(["wedding_photographer"], [], interests, []),
    ).toEqual(["wedding_photographer"])
  })

  it("falls back to the trades when no interest applies to them", () => {
    expect(jobTypesInScope([], [], ["wedding_dj"], ["planner"])).toEqual([
      "wedding_planner",
    ])
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
  const base = {
    types: [],
    professions: [],
    details: [],
    region: null,
    period: "all",
  }
  const regions = [
    { id: "all", label: "All regions" },
    { id: "Sicily", label: "Sicily" },
  ]

  it("shows nothing for the defaults", () => {
    expect(activeFilters({ ...base, regions })).toEqual([])
  })

  it("lists what is on, in the sheet's order", () => {
    const active = activeFilters({
      types: ["festival_dj"],
      settings: ["wedding"],
      professions: ["cleaner"],
      details: ["techno"],
      region: "Sicily",
      period: "week",
      regions,
    })
    expect(active.map(({ kind, id }) => `${kind}:${id}`)).toEqual([
      "type:festival_dj",
      "setting:wedding",
      "profession:cleaner",
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
