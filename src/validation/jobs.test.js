import { describe, expect, it } from "vitest"

import { t } from "../i18n/index.js"
import { firstError, normalizeJob, normalizePay, validateJob } from "./jobs.js"

const validWedding = {
  setting: "wedding",
  profession: "photographer",
  title: "Ada & Grace",
  location: "Villa",
  country: "Italy",
  region: "Lombardy",
  job_date: "2026-06-01",
  application_deadline: "2026-05-01T12:00:00.000Z",
  details: { spouse_first_name_1: "Ada", spouse_first_name_2: "Grace" },
}

const validFestival = {
  ...validWedding,
  setting: "festival",
  details: { headliner: "Nina" },
}

const validApartment = {
  ...validWedding,
  setting: "apartment",
  profession: "cleaner",
  title: "Deep clean",
  details: {},
}

describe("normalizeJob", () => {
  it("trims the text fields", () => {
    expect(
      normalizeJob({
        ...validWedding,
        title: "  Ada & Grace  ",
        location: "  Villa  ",
        country: "  Italy  ",
        region: "  Lombardy  ",
      }),
    ).toMatchObject({
      title: "Ada & Grace",
      location: "Villa",
      country: "Italy",
      region: "Lombardy",
    })
  })

  it("leaves the date fields exactly as given", () => {
    expect(
      normalizeJob({
        ...validWedding,
        job_date: "  2026-06-01  ",
        application_deadline: "  2026-05-01T12:00:00.000Z  ",
      }),
    ).toMatchObject({
      job_date: "  2026-06-01  ",
      application_deadline: "  2026-05-01T12:00:00.000Z  ",
    })
  })

  it("defaults the fields a brand new row needs", () => {
    expect(normalizeJob({})).toMatchObject({
      setting: "wedding",
      max_applicants: 5,
      details: {},
    })
  })

  it("keeps unrecognised keys inside details", () => {
    const row = normalizeJob({
      ...validFestival,
      details: { headliner: "Nina", sponsor: "Kept" },
    })
    expect(row.details.sponsor).toBe("Kept")
  })

  it("copies the photo list so a later edit does not change the row", () => {
    const image_urls = ["https://example.com/a.jpg"]
    const row = normalizeJob({ ...validWedding, image_urls })
    image_urls.push("https://example.com/b.jpg")
    expect(row.image_urls).toEqual(["https://example.com/a.jpg"])
    expect(normalizeJob(validWedding).image_urls).toBeUndefined()
  })

  it("returns a details object of its own", () => {
    const source = { ...validWedding, details: { spouse_first_name_1: "Ada" } }
    const row = normalizeJob(source)

    expect(row.details).not.toBe(source.details)

    source.details.spouse_first_name_1 = "Changed"
    expect(row.details.spouse_first_name_1).toBe("Ada")
  })
})

describe("validateJob", () => {
  it("accepts a complete wedding", () => {
    expect(validateJob(validWedding)).toEqual({})
  })

  it("accepts a complete apartment job", () => {
    expect(validateJob(validApartment)).toEqual({})
  })

  it("needs a trade that works on this kind of job", () => {
    expect(
      validateJob({ ...validApartment, profession: "photographer" }).profession,
    ).toBe("validation.pickJobType")
  })

  it("needs a known trade", () => {
    expect(validateJob({ ...validWedding, profession: "" }).profession).toBe(
      "validation.pickJobType",
    )
    expect(
      validateJob({ ...validWedding, profession: "wizard" }).profession,
    ).toBe("validation.pickJobType")
  })

  it("accepts a complete festival", () => {
    expect(validateJob(validFestival)).toEqual({})
  })

  it.each([
    ["title", "   "],
    ["location", ""],
    ["country", ""],
    ["region", ""],
    ["job_date", "01/06/2026"],
    ["job_date", ""],
    ["application_deadline", "soon"],
    ["application_deadline", ""],
    ["max_applicants", 0],
    ["max_applicants", 2.5],
    ["max_applicants", -3],
  ])("flags a bad %s", (field, value) => {
    expect(validateJob({ ...validWedding, [field]: value })).toHaveProperty(
      field,
    )
  })

  it("keeps the date wording the UI already relied on", () => {
    expect(t(validateJob({ ...validWedding, job_date: "nope" }).job_date)).toBe(
      "Pick a date",
    )
    expect(
      t(
        validateJob({ ...validWedding, application_deadline: "nope" })
          .application_deadline,
      ),
    ).toBe("Pick a deadline")
  })

  it("asks for the missing title in words a person can act on", () => {
    expect(t(validateJob({ ...validWedding, title: "  " }).title)).toBe(
      "Add a title",
    )
  })

  it("knows a wedding by its two names", () => {
    expect(
      inWords(
        validateJob({
          ...validWedding,
          details: { spouse_first_name_1: "Ada" },
        }).details,
      ),
    ).toEqual({ spouse_first_name_2: "Add a name" })

    expect(
      inWords(validateJob({ ...validWedding, details: {} }).details),
    ).toEqual({
      spouse_first_name_1: "Add a name",
      spouse_first_name_2: "Add a name",
    })
  })

  it("accepts a concert musician with a genre", () => {
    expect(
      validateJob({
        ...validFestival,
        setting: "concert",
        profession: "musician",
        details: { headliner: "Nina", genres: ["classical"] },
      }),
    ).toEqual({})
  })

  it("accepts a wedding planner and a make-up artist", () => {
    for (const profession of ["planner", "makeup_artist"]) {
      expect(validateJob({ ...validWedding, profession })).toEqual({})
    }
  })

  it("has no concert DJ", () => {
    expect(
      Object.keys(
        validateJob({
          ...validFestival,
          setting: "concert",
          profession: "dj",
        }),
      ),
    ).toEqual(["profession"])
  })

  it("knows a festival by its headliner", () => {
    expect(
      inWords(validateJob({ ...validFestival, details: {} }).details),
    ).toEqual({
      headliner: "Add a headliner",
    })
  })

  it("checks the optional style against the taxonomy", () => {
    expect(
      inWords(
        validateJob({
          ...validWedding,
          details: { ...validWedding.details, styles: ["classic", "x"] },
        }).details,
      ),
    ).toEqual({ styles: "Pick a style" })
    expect(
      validateJob({
        ...validWedding,
        details: { ...validWedding.details, styles: ["classic", "film"] },
      }),
    ).toEqual({})
  })

  it("checks the optional genre against the taxonomy", () => {
    expect(
      inWords(
        validateJob({
          ...validFestival,
          details: { headliner: "Nina", genres: "jazz" },
        }).details,
      ),
    ).toEqual({ genres: "Pick a genre" })
    expect(
      validateJob({
        ...validFestival,
        details: { headliner: "Nina", genres: ["jazz"] },
      }),
    ).toEqual({})
  })

  it("rejects a setting it knows nothing about", () => {
    const reunion = { ...validWedding, setting: "reunion", details: {} }
    expect(inWords(validateJob(reunion))).toEqual({
      setting: "Pick a setting",
    })
  })
})

describe("firstError", () => {
  it("returns nothing when there are no errors", () => {
    expect(firstError({})).toBeUndefined()
  })

  it("digs into nested details", () => {
    expect(
      firstError({ title: "Add a title", details: { headliner: "Add one" } }),
    ).toBe("Add a title")
    expect(firstError({ details: { headliner: "Add one" } })).toBe("Add one")
  })
})

function inWords(errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [field, t(message)]),
  )
}

describe("the pay of a job", () => {
  const withPay = (pay) => validateJob({ ...validWedding, pay })

  it("can be left out, to be agreed, or unpaid", () => {
    expect(validateJob(validWedding)).toEqual({})
    expect(withPay({ kind: "to_agree" })).toEqual({})
    expect(withPay({ kind: "unpaid" })).toEqual({})
  })

  it("needs an amount when it's fixed", () => {
    expect(
      withPay({ kind: "fixed", amount_min: 500, currency: "EUR" }),
    ).toEqual({})
    expect(withPay({ kind: "fixed", currency: "EUR" })).toHaveProperty(
      "pay_min",
    )
    expect(
      withPay({ kind: "fixed", amount_min: 0, currency: "EUR" }),
    ).toHaveProperty("pay_min")
  })

  it("needs a top above the bottom when it's a range", () => {
    const range = { kind: "range", amount_min: 300, currency: "EUR" }
    expect(withPay({ ...range, amount_max: 400 })).toEqual({})
    expect(withPay({ ...range, amount_max: 300 })).toHaveProperty("pay_max")
  })

  it("refuses a currency the app doesn't offer", () => {
    expect(
      withPay({ kind: "fixed", amount_min: 1, currency: "XXX" }),
    ).toHaveProperty("pay_currency")
  })

  it("is written without leftovers from another kind", () => {
    expect(normalizePay({ kind: "to_agree", amount_min: 5 })).toEqual({
      kind: "to_agree",
      amount_min: null,
      amount_max: null,
      currency: "EUR",
    })
    expect(
      normalizePay({ kind: "fixed", amount_min: 5, amount_max: 9 }).amount_max,
    ).toBeNull()
    expect(normalizePay({ kind: "unpaid", amount_min: 5 })).toEqual({
      kind: "unpaid",
      amount_min: null,
      amount_max: null,
      currency: "EUR",
    })
    expect(normalizePay()).toHaveProperty("kind", "to_agree")
  })
})
