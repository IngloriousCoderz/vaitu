import { describe, expect, it } from "vitest"

import {
  CURRENCIES,
  DETAILS_BY_CATEGORY,
  JOB_TYPES,
  JOB_TYPES_WITHOUT_STYLE,
  MUSIC_GENRES,
  offeredJobTypes,
  systemPrompt,
  TITLED_CATEGORIES,
  toEventFields,
  WEDDING_STYLES,
} from "../../../supabase/functions/parse-event/schema.ts"
import { CURRENCIES as APP_CURRENCIES } from "../../data/currencies.js"
import {
  jobTypes,
  musicGenres,
  weddingStyles,
} from "../../data/event-taxonomy.js"
import { categories, hasDetail } from "../event-list/categories.js"

describe("parse-event's copies", () => {
  it("knows every job type, style and genre", () => {
    expect(JOB_TYPES).toEqual(jobTypes.map((jobType) => jobType.id))
    expect(WEDDING_STYLES).toEqual(weddingStyles.map((o) => o.value))
    expect(MUSIC_GENRES).toEqual(musicGenres.map((o) => o.value))
    expect(CURRENCIES).toEqual(APP_CURRENCIES)
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

  it("asks to keep the form's job type when there is one", () => {
    expect(systemPrompt("2026-11-01", JOB_TYPES, "wedding_dj")).toContain(
      'The form is set to "wedding_dj"',
    )
  })
})

describe("toEventFields", () => {
  const answer = {
    job_type: "wedding_photographer",
    title: "Ignored",
    location: " Firenze ",
    country: "Italy",
    region: "Tuscany",
    event_date: "2027-06-12",
    details: {
      spouse_first_name_1: "Giulia",
      spouse_first_name_2: "Marco",
      style: "reportage",
      headliner: "Not a wedding field",
    },
  }

  it("keeps a wedding's fields, and no title", () => {
    expect(toEventFields(answer, JOB_TYPES, null)).toEqual({
      job_type: "wedding_photographer",
      title: null,
      location: "Firenze",
      country: "Italy",
      region: "Tuscany",
      event_date: "2027-06-12",
      details: {
        spouse_first_name_1: "Giulia",
        spouse_first_name_2: "Marco",
        style: "reportage",
      },
      pay: null,
    })
  })

  it("keeps a festival's fields and name", () => {
    const fields = toEventFields(
      {
        job_type: "festival_dj",
        title: "Sundance Beats",
        details: { headliner: "Ada", genre: "techno", style: "film" },
      },
      JOB_TYPES,
      null,
    )
    expect(fields.title).toBe("Sundance Beats")
    expect(fields.details).toEqual({ headliner: "Ada", genre: "techno" })
  })

  it("keeps a concert's fields and name", () => {
    const fields = toEventFields(
      {
        job_type: "concert_musician",
        title: "Notte Rock",
        details: { headliner: "Ada", genre: "rock" },
      },
      JOB_TYPES,
      null,
    )
    expect(fields.title).toBe("Notte Rock")
    expect(fields.details).toEqual({ headliner: "Ada", genre: "rock" })
  })

  it("drops the style of a wedding job that has none", () => {
    const fields = toEventFields(
      {
        job_type: "wedding_makeup_artist",
        details: {
          spouse_first_name_1: "Ada",
          spouse_first_name_2: "Tom",
          style: "film",
        },
      },
      JOB_TYPES,
      null,
    )
    expect(fields.details).toEqual({
      spouse_first_name_1: "Ada",
      spouse_first_name_2: "Tom",
      style: null,
    })
  })

  it("gives a property job a title and no details", () => {
    const fields = toEventFields(
      {
        job_type: "house_cleaner",
        title: "Deep clean",
        details: { style: "film" },
      },
      JOB_TYPES,
      null,
    )
    expect(fields.title).toBe("Deep clean")
    expect(fields.details).toEqual({})
  })

  it("drops a value that is not on its list", () => {
    const fields = toEventFields(
      { job_type: "festival_dj", details: { genre: "polka" } },
      JOB_TYPES,
      null,
    )
    expect(fields.details.genre).toBeNull()
  })

  it("stays on the form's job type when the answer is not an offered one", () => {
    expect(
      toEventFields(
        { job_type: "wedding_dj" },
        ["house_cleaner"],
        "house_cleaner",
      ).job_type,
    ).toBe("house_cleaner")
    expect(
      toEventFields({ job_type: "polka" }, JOB_TYPES, null).job_type,
    ).toBeNull()
  })

  it("keeps a fixed amount or a range, and nothing else", () => {
    const pay = (given) => toEventFields({ pay: given }, JOB_TYPES, null).pay
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
    ).toBe("EUR")
    expect(pay({ kind: "range", amount_min: 400, amount_max: 300 })).toBeNull()
    expect(pay({ kind: "fixed", amount_min: "lots" })).toBeNull()
    expect(pay(null)).toBeNull()
  })

  it("drops a malformed date, and survives a useless answer", () => {
    expect(
      toEventFields({ event_date: "June 12" }, JOB_TYPES, null).event_date,
    ).toBeNull()
    expect(toEventFields({}, JOB_TYPES, null)).toEqual({
      job_type: null,
      title: null,
      location: null,
      country: null,
      region: null,
      event_date: null,
      details: {},
      pay: null,
    })
  })
})
