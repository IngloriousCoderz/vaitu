import { describe, expect, it } from "vitest"

import {
  jobTypeById,
  musicGenres,
  weddingStyles,
} from "../../data/job-taxonomy.js"
import {
  detailAppliesTo,
  filterSections,
  filterSectionsFor,
  hasDetail,
} from "./categories.js"

const jobType = jobTypeById

describe("filterSections", () => {
  it("offers every wedding style and every music genre when no category is picked", () => {
    const [style, genre, ...others] = filterSections([])
    expect(others).toEqual([])
    expect(style.categories).toEqual(["wedding"])
    expect(style.title).toBe("Wedding style")
    expect(style.options).toEqual(options(weddingStyles))
    expect(genre.categories).toEqual(["festival", "concert"])
    expect(genre.title).toBe("Music genre")
    expect(genre.options).toEqual(options(musicGenres))
  })

  it("offers only the sections of the picked categories", () => {
    expect(filterSections(["festival"]).map((s) => s.id)).toEqual(["genres"])
  })
})

describe("filterSectionsFor", () => {
  const ids = (...jobTypes) =>
    filterSectionsFor(jobTypes.map(jobType)).map((section) => section.id)

  it("offers no wedding style to planners and make-up artists", () => {
    expect(ids("wedding_planner", "wedding_makeup_artist")).toEqual([])
    expect(ids("wedding_planner", "wedding_photographer")).toEqual(["styles"])
  })

  it("offers the genre once for festivals and concerts", () => {
    expect(ids("festival_musician", "concert_musician")).toEqual(["genres"])
  })

  it("offers everything without a job type", () => {
    expect(ids()).toEqual(["styles", "genres"])
  })
})

describe("hasDetail", () => {
  it("is false for the wedding jobs without a style and for property jobs", () => {
    expect(hasDetail(jobType("wedding_photographer"))).toBe(true)
    expect(hasDetail(jobType("concert_musician"))).toBe(true)
    expect(hasDetail(jobType("wedding_planner"))).toBe(false)
    expect(hasDetail(jobType("wedding_makeup_artist"))).toBe(false)
    expect(hasDetail(jobType("house_cleaner"))).toBe(false)
  })
})

describe("detailAppliesTo", () => {
  it("knows which job types a style or genre filters", () => {
    expect(detailAppliesTo("editorial", jobType("wedding_dj"))).toBe(true)
    expect(detailAppliesTo("editorial", jobType("wedding_planner"))).toBe(false)
    expect(detailAppliesTo("techno", jobType("festival_dj"))).toBe(true)
    expect(detailAppliesTo("techno", jobType("concert_musician"))).toBe(true)
    expect(detailAppliesTo("techno", jobType("wedding_dj"))).toBe(false)
    expect(detailAppliesTo("polka", jobType("festival_dj"))).toBe(false)
  })
})

function options(list) {
  return list.map((option) => ({ id: option.value, label: option.label }))
}
