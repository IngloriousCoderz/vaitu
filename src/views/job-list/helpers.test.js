import { describe, expect, it } from "vitest"

import { availableJobTypes } from "../../data/job-taxonomy.js"
import {
  activeFilters,
  defaultRegion,
  distinctRegions,
  inScope,
  jobTypesInScope,
  regionInEffect,
} from "./helpers.js"

describe("jobTypesInScope", () => {
  const everything = availableJobTypes.map((jobType) => jobType.id)

  it("takes the job types of the settings and professions in scope", () => {
    expect(jobTypesInScope([], [], [])).toEqual(everything)
    expect(jobTypesInScope([], ["wedding"], ["photographer"])).toEqual([
      "wedding_photographer",
    ])
    expect(jobTypesInScope([], ["wedding"], [])).toEqual(everything)
  })

  it("narrows to the job types the picked styles apply to", () => {
    expect(jobTypesInScope(["editorial"], [], ["dj"])).toEqual(["wedding_dj"])
    expect(jobTypesInScope(["editorial"], [], [])).not.toContain(
      "wedding_planner",
    )
  })
})

describe("inScope", () => {
  it("takes what the feed picks, else what the profile does", () => {
    expect(inScope(["dj"], ["planner"])).toEqual(["dj"])
    expect(inScope([], ["planner"])).toEqual(["planner"])
    expect(inScope([])).toEqual([])
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
      settings: ["wedding"],
      professions: ["cleaner"],
      details: ["techno"],
      region: "Sicily",
      period: "week",
      regions,
    })
    expect(active.map(({ kind, id }) => `${kind}:${id}`)).toEqual([
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
