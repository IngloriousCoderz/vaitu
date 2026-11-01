import { describe, expect, it } from "vitest"

import { interestsFor, jobTypes, jobTypesFor } from "./event-taxonomy.js"

describe("jobTypesFor", () => {
  const ids = (professions) => jobTypesFor(professions).map((type) => type.id)

  it("offers only the job types of the picked trades", () => {
    expect(ids(["cleaner"])).toEqual([
      "apartment_cleaner",
      "house_cleaner",
      "office_cleaner",
    ])
    expect(ids(["photographer"])).toContain("office_photographer")
  })

  it("offers every job type without a trade", () => {
    expect(ids([])).toHaveLength(jobTypes.length)
  })
})

describe("interestsFor", () => {
  it("drops the job types of the trades no longer picked", () => {
    const interests = ["wedding_photographer", "office_cleaner"]
    expect(interestsFor(interests, ["cleaner"])).toEqual(["office_cleaner"])
    expect(interestsFor(interests, [])).toEqual(interests)
  })
})
