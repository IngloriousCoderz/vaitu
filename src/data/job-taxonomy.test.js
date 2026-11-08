import { describe, expect, it } from "vitest"

import {
  availableJobTypes,
  jobTypesFor,
  offeredSettings,
  professionOption,
  professions,
  settingOption,
} from "./job-taxonomy.js"

describe("availableJobTypes", () => {
  it("offers weddings only, and only the trades that work them", () => {
    expect(availableJobTypes.map((type) => type.setting)).toEqual(
      availableJobTypes.map(() => "wedding"),
    )
    expect(professions.map((profession) => profession.id)).toEqual([
      "photographer",
      "videographer",
      "musician",
      "dj",
      "planner",
      "makeup_artist",
    ])
  })
})

describe("jobTypesFor", () => {
  const ids = (picked) => jobTypesFor(picked).map((type) => type.id)
  const everything = availableJobTypes.map((type) => type.id)

  it("offers only the job types of the picked trades", () => {
    expect(ids(["photographer"])).toEqual(["wedding_photographer"])
    expect(ids(["dj", "planner"])).toEqual(["wedding_dj", "wedding_planner"])
  })

  it("offers every job type without a trade on offer", () => {
    expect(ids([])).toEqual(everything)
    expect(ids(["cleaner"])).toEqual(everything)
  })

  it("narrows to the picked settings, and ignores those not on offer", () => {
    const inSettings = (professionIds, settingIds) =>
      jobTypesFor(professionIds, settingIds).map((type) => type.id)
    expect(inSettings(["photographer"], ["wedding"])).toEqual([
      "wedding_photographer",
    ])
    expect(inSettings([], ["wedding"])).toEqual(everything)
    expect(inSettings(["photographer"], ["festival"])).toEqual([
      "wedding_photographer",
    ])
  })
})

describe("offeredSettings", () => {
  it("lists the settings on offer, weddings only for now", () => {
    expect(offeredSettings).toEqual([
      { id: "wedding", label: "taxonomy.setting.wedding" },
    ])
  })
})

describe("settingOption", () => {
  it("names a setting for a picker", () => {
    expect(settingOption("wedding")).toEqual({
      value: "wedding",
      label: "taxonomy.setting.wedding",
    })
  })
})

describe("professionOption", () => {
  it("names a job type by its profession", () => {
    expect(professionOption(availableJobTypes[0]).label).toBe(
      "taxonomy.profession.photographer",
    )
  })
})
