import { describe, expect, it } from "vitest"

import {
  CURRENCIES,
  DESCRIPTION_MAX_LENGTH,
  DETAILS_BY_CATEGORY,
  JOB_TYPES,
  JOB_TYPES_WITHOUT_STYLE,
  MUSIC_GENRES,
  offeredJobTypes,
  systemPrompt,
  TITLED_CATEGORIES,
  todayOf,
  toJobFields,
  WEDDING_STYLES,
} from "../../../supabase/functions/parse-job/schema.ts"
import { DESCRIPTION_MAX_LENGTH as APP_DESCRIPTION_MAX_LENGTH } from "../../constants/index.js"
import { CURRENCIES as APP_CURRENCIES } from "../../data/currencies.js"
import {
  jobTypes,
  musicGenres,
  weddingStyles,
} from "../../data/job-taxonomy.js"
import { categories, hasDetail } from "../job-list/categories.js"

describe("parse-job's copies", () => {
  it("knows every job type, style and genre", () => {
    expect(JOB_TYPES).toEqual(jobTypes.map((jobType) => jobType.id))
    expect(WEDDING_STYLES).toEqual(weddingStyles.map((o) => o.value))
    expect(MUSIC_GENRES).toEqual(musicGenres.map((o) => o.value))
    expect(CURRENCIES).toEqual(APP_CURRENCIES)
    expect(DESCRIPTION_MAX_LENGTH).toBe(APP_DESCRIPTION_MAX_LENGTH)
  })

  it("knows which wedding jobs have no style", () => {
    expect(JOB_TYPES_WITHOUT_STYLE).toEqual(
      jobTypes
        .filter(
          (jobType) => jobType.category === "wedding" && !hasDetail(jobType),
        )
        .map((jobType) => jobType.id),
    )
  })

  it("asks for the fields the create form has", () => {
    for (const category of categories) {
      const fields = Object.entries(DETAILS_BY_CATEGORY[category.id])
      expect(fields).toEqual(
        category.createFields.map((spec) => [
          spec.field,
          spec.options?.map((option) => option.value) ?? null,
        ]),
      )
      expect(TITLED_CATEGORIES.includes(category.id)).toBe(
        Boolean(category.title_from.input),
      )
    }
  })
})

describe("offeredJobTypes", () => {
  it("keeps the known job types it is asked for", () => {
    expect(
      offeredJobTypes(["house_cleaner", "polka_dj", "office_cleaner"]),
    ).toEqual(["house_cleaner", "office_cleaner"])
  })

  it("falls back on all of them", () => {
    expect(offeredJobTypes(undefined)).toEqual(JOB_TYPES)
    expect(offeredJobTypes(["polka_dj"])).toEqual(JOB_TYPES)
  })
})

describe("systemPrompt", () => {
  it("only offers the job types it is given", () => {
    const prompt = systemPrompt("2026-11-01", ["house_cleaner"], null)
    expect(prompt).toContain('"house_cleaner"')
    expect(prompt).not.toContain('"wedding_dj"')
  })

  it("says which weekday today is, for relative dates", () => {
    expect(systemPrompt("2026-11-01", JOB_TYPES, null)).toContain(
      "Today is Sunday 2026-11-01.",
    )
  })

  it("asks to keep the form's job type when there is one", () => {
    expect(systemPrompt("2026-11-01", JOB_TYPES, "wedding_dj")).toContain(
      'The form is set to "wedding_dj"',
    )
  })
})

describe("todayOf", () => {
  it("trusts the client's date, and falls back to the server's", () => {
    expect(todayOf("2026-11-13")).toBe("2026-11-13")
    expect(todayOf("tomorrow")).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(todayOf(undefined)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("toJobFields", () => {
  const answer = {
    job_type: "wedding_photographer",
    title: "Ignored",
    location: " Firenze ",
    country: "Italy",
    region: "Tuscany",
    job_date: "2027-06-12",
    details: {
      spouse_first_name_1: "Giulia",
      spouse_first_name_2: "Marco",
      styles: ["reportage", "film", "polka"],
      headliner: "Not a wedding field",
    },
  }

  it("keeps a wedding's fields, and no title", () => {
    expect(toJobFields(answer, JOB_TYPES, null)).toEqual({
      job_type: "wedding_photographer",
      title: null,
      location: "Firenze",
      country: "Italy",
      region: "Tuscany",
      job_date: "2027-06-12",
      application_deadline: null,
      max_applicants: null,
      details: {
        spouse_first_name_1: "Giulia",
        spouse_first_name_2: "Marco",
        styles: ["reportage", "film"],
      },
      description: null,
      pay: null,
    })
  })

  it("keeps a festival's fields and name", () => {
    const fields = toJobFields(
      {
        job_type: "festival_dj",
        title: "Sundance Beats",
        details: { headliner: "Ada", genres: ["techno"], styles: ["film"] },
      },
      JOB_TYPES,
      null,
    )
    expect(fields.title).toBe("Sundance Beats")
    expect(fields.details).toEqual({ headliner: "Ada", genres: ["techno"] })
  })

  it("keeps a concert's fields and name", () => {
    const fields = toJobFields(
      {
        job_type: "concert_musician",
        title: "Notte Rock",
        details: { headliner: "Ada", genres: "rock" },
      },
      JOB_TYPES,
      null,
    )
    expect(fields.title).toBe("Notte Rock")
    expect(fields.details).toEqual({ headliner: "Ada", genres: ["rock"] })
  })

  it("drops the style of a wedding job that has none", () => {
    const fields = toJobFields(
      {
        job_type: "wedding_makeup_artist",
        details: {
          spouse_first_name_1: "Ada",
          spouse_first_name_2: "Tom",
          styles: ["film"],
        },
      },
      JOB_TYPES,
      null,
    )
    expect(fields.details).toEqual({
      spouse_first_name_1: "Ada",
      spouse_first_name_2: "Tom",
      styles: [],
    })
  })

  it("gives a property job a title and no details", () => {
    const fields = toJobFields(
      {
        job_type: "house_cleaner",
        title: "Deep clean",
        details: { styles: ["film"] },
      },
      JOB_TYPES,
      null,
    )
    expect(fields.title).toBe("Deep clean")
    expect(fields.details).toEqual({})
  })

  it("drops a value that is not on its list", () => {
    const fields = toJobFields(
      { job_type: "festival_dj", details: { genres: ["polka"] } },
      JOB_TYPES,
      null,
    )
    expect(fields.details.genres).toEqual([])
  })

  it("stays on the form's job type when the answer is not an offered one", () => {
    expect(
      toJobFields(
        { job_type: "wedding_dj" },
        ["house_cleaner"],
        "house_cleaner",
      ).job_type,
    ).toBe("house_cleaner")
    expect(
      toJobFields({ job_type: "polka" }, JOB_TYPES, null).job_type,
    ).toBeNull()
  })

  it("keeps a fixed amount or a range, and nothing else", () => {
    const pay = (given) => toJobFields({ pay: given }, JOB_TYPES, null).pay
    expect(pay({ kind: "fixed", amount_min: 500, currency: "EUR" })).toEqual({
      kind: "fixed",
      amount_min: 500,
      amount_max: null,
      currency: "EUR",
    })
    expect(
      pay({ kind: "range", amount_min: 300, amount_max: 400, currency: "CHF" }),
    ).toEqual({
      kind: "range",
      amount_min: 300,
      amount_max: 400,
      currency: "CHF",
    })
    expect(
      pay({ kind: "fixed", amount_min: 5, currency: "XXX" }).currency,
    ).toBeNull()
    expect(
      pay({ kind: "fixed", amount_min: 5, currency: "AUD" }).currency,
    ).toBe("AUD")
    expect(pay({ kind: "range", amount_min: 400, amount_max: 300 })).toBeNull()
    expect(pay({ kind: "fixed", amount_min: "lots" })).toBeNull()
    expect(pay(null)).toBeNull()
  })

  it("keeps a local deadline, and drops anything else", () => {
    const deadline = (given) =>
      toJobFields({ application_deadline: given }, JOB_TYPES, null)
        .application_deadline
    expect(deadline("2026-11-13T15:30")).toBe("2026-11-13T15:30")
    expect(deadline("2026-11-13")).toBeNull()
    expect(deadline("2026-11-13T15:30:00Z")).toBeNull()
    expect(deadline("next Friday")).toBeNull()
  })

  it("keeps a shortlist size of one or more", () => {
    const places = (given) =>
      toJobFields({ max_applicants: given }, JOB_TYPES, null).max_applicants
    expect(places(3)).toBe(3)
    expect(places(0)).toBeNull()
    expect(places(2.5)).toBeNull()
    expect(places("five")).toBeNull()
  })

  it("keeps the description, trimmed and capped", () => {
    const description = (given) =>
      toJobFields({ description: given }, JOB_TYPES, null).description
    expect(description("  - Bring a fan\n- Cruelty-free makeup  ")).toBe(
      "- Bring a fan\n- Cruelty-free makeup",
    )
    expect(description("x".repeat(DESCRIPTION_MAX_LENGTH + 1))).toHaveLength(
      DESCRIPTION_MAX_LENGTH,
    )
    expect(description("   ")).toBeNull()
    expect(description(42)).toBeNull()
  })

  it("drops a malformed date, and survives a useless answer", () => {
    expect(
      toJobFields({ job_date: "June 12" }, JOB_TYPES, null).job_date,
    ).toBeNull()
    expect(toJobFields({}, JOB_TYPES, null)).toEqual({
      job_type: null,
      title: null,
      location: null,
      country: null,
      region: null,
      job_date: null,
      application_deadline: null,
      max_applicants: null,
      details: {},
      description: null,
      pay: null,
    })
  })
})
