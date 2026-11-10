import { describe, expect, it } from "vitest"

import {
  jobTypeById,
  musicGenres,
  weddingMoments,
  weddingStyles,
} from "../../data/job-taxonomy.js"
import {
  detailAppliesTo,
  filterSections,
  filterSectionsFor,
  hasDetail,
} from "./job-settings.js"

const jobType = jobTypeById

describe("filterSections", () => {
  it("offers every style, part of the day and genre when no setting is picked", () => {
    const [style, moment, genre, ...others] = filterSections([])
    expect(others).toEqual([])
    expect(style.settings).toEqual(["wedding"])
    expect(style.title).toBe("Wedding style")
    expect(style.options).toEqual(options(weddingStyles))
    expect(moment.settings).toEqual(["wedding"])
    expect(moment.options).toEqual(options(weddingMoments))
    expect(genre.settings).toEqual(["wedding", "festival", "concert"])
    expect(genre.title).toBe("Music genre")
    expect(genre.options).toEqual(options(musicGenres))
  })

  it("offers only the sections of the picked settings", () => {
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

  it("offers parts of the day and genres for music at weddings, not styles", () => {
    expect(ids("wedding_dj", "festival_dj")).toEqual(["moments", "genres"])
  })

  it("offers everything without a job type", () => {
    expect(ids()).toEqual(["styles", "moments", "genres"])
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
    expect(detailAppliesTo("editorial", jobType("wedding_photographer"))).toBe(
      true,
    )
    expect(detailAppliesTo("editorial", jobType("wedding_dj"))).toBe(false)
    expect(detailAppliesTo("editorial", jobType("wedding_planner"))).toBe(false)
    expect(detailAppliesTo("techno", jobType("festival_dj"))).toBe(true)
    expect(detailAppliesTo("techno", jobType("concert_musician"))).toBe(true)
    expect(detailAppliesTo("techno", jobType("wedding_dj"))).toBe(true)
    expect(detailAppliesTo("ceremony", jobType("wedding_musician"))).toBe(true)
    expect(detailAppliesTo("ceremony", jobType("festival_musician"))).toBe(
      false,
    )
    expect(detailAppliesTo("polka", jobType("festival_dj"))).toBe(false)
  })
})

function options(list) {
  return list.map((option) => ({ id: option.value, label: option.label }))
}
