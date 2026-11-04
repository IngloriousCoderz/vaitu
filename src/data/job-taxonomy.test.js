import { describe, expect, it } from "vitest"

import {
  availableJobTypes,
  interestsFor,
  jobTypesFor,
  professions,
} from "./job-taxonomy.js"

describe("availableJobTypes", () => {
  it("offers weddings only, and only the trades that work them", () => {
    expect(availableJobTypes.map((type) => type.category)).toEqual(
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
})

describe("interestsFor", () => {
  it("drops the job types of the trades no longer picked", () => {
    const interests = ["wedding_photographer", "wedding_dj"]
    expect(interestsFor(interests, ["dj"])).toEqual(["wedding_dj"])
    expect(interestsFor(interests, [])).toEqual(interests)
  })
})
