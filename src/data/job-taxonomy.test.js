import { describe, expect, it } from "vitest"

import { localized } from "../i18n/index.js"
import {
  availableJobTypes,
  detailLabel,
  detailOptions,
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

describe("detailOptions", () => {
  const locales = Object.keys(import.meta.glob("../i18n/locales/*.json"))
    .map((path) => path.match(/(\w+)\.json$/)[1])
    .sort()

  it.each(detailOptions.map((option) => [option.value, option]))(
    "%s has a label in every locale",
    (_, option) => {
      expect(Object.keys(option.labels).sort()).toEqual(locales)
    },
  )
})

describe("detailLabel", () => {
  it("labels a known value, and shows an unknown one as it is", () => {
    expect(detailLabel("soul_funk")).toBe("Soul & funk")
    expect(detailLabel("polka")).toBe("polka")
  })
})

describe("localized", () => {
  it("falls back on English", () => {
    expect(localized({ en: "Jazz" })).toBe("Jazz")
  })
})
