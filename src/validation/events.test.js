import { describe, expect, it } from "vitest"

import { translated } from "../i18n/index.js"
import { firstError, normalizeEvent, validateEvent } from "./events.js"

const validWedding = {
  category: "wedding",
  title: "Ada & Grace",
  location: "Villa",
  country: "Italy",
  region: "Lombardy",
  event_date: "2026-06-01",
  application_deadline: "2026-05-01T12:00:00.000Z",
  details: { spouse_first_name_1: "Ada", spouse_first_name_2: "Grace" },
}

const validFestival = {
  ...validWedding,
  category: "festival",
  details: { headliner: "Nina" },
}

describe("normalizeEvent", () => {
  it("trims the text fields", () => {
    expect(
      normalizeEvent({
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
      normalizeEvent({
        ...validWedding,
        event_date: "  2026-06-01  ",
        application_deadline: "  2026-05-01T12:00:00.000Z  ",
      }),
    ).toMatchObject({
      event_date: "  2026-06-01  ",
      application_deadline: "  2026-05-01T12:00:00.000Z  ",
    })
  })

  it("defaults the fields a brand new row needs", () => {
    expect(normalizeEvent({})).toMatchObject({
      category: "wedding",
      max_applicants: 5,
      details: {},
    })
  })

  it("keeps unrecognised keys inside details", () => {
    const row = normalizeEvent({
      ...validFestival,
      details: { headliner: "Nina", sponsor: "Kept" },
    })
    expect(row.details.sponsor).toBe("Kept")
  })

  it("copies the photo list so a later edit does not change the row", () => {
    const image_urls = ["https://example.com/a.jpg"]
    const row = normalizeEvent({ ...validWedding, image_urls })
    image_urls.push("https://example.com/b.jpg")
    expect(row.image_urls).toEqual(["https://example.com/a.jpg"])
    expect(normalizeEvent(validWedding).image_urls).toBeUndefined()
  })

  it("returns a details object of its own", () => {
    const source = { ...validWedding, details: { spouse_first_name_1: "Ada" } }
    const row = normalizeEvent(source)

    expect(row.details).not.toBe(source.details)

    source.details.spouse_first_name_1 = "Changed"
    expect(row.details.spouse_first_name_1).toBe("Ada")
  })

  it("distinguishes an explicit null from an absent audio_url", () => {
    expect(normalizeEvent({ ...validWedding, audio_url: null })).toHaveProperty(
      "audio_url",
      null,
    )
    expect(normalizeEvent(validWedding)).not.toHaveProperty("audio_url")
  })

  it("forwards a transcript instead of dropping it", () => {
    const row = normalizeEvent({ ...validWedding, transcript: "Welcome" })
    expect(row.transcript).toBe("Welcome")
  })

  it("leaves transcript_status out when the caller omits it", () => {
    expect(normalizeEvent(validWedding)).not.toHaveProperty("transcript_status")
    expect(
      normalizeEvent({ ...validWedding, transcript_status: "done" })
        .transcript_status,
    ).toBe("done")
  })
})

describe("validateEvent", () => {
  it("accepts a complete wedding", () => {
    expect(validateEvent(validWedding)).toEqual({})
  })

  it("accepts a complete festival", () => {
    expect(validateEvent(validFestival)).toEqual({})
  })

  it.each([
    ["title", "   "],
    ["location", ""],
    ["country", ""],
    ["region", ""],
    ["event_date", "01/06/2026"],
    ["event_date", ""],
    ["application_deadline", "soon"],
    ["application_deadline", ""],
    ["max_applicants", 0],
    ["max_applicants", 2.5],
    ["max_applicants", -3],
    ["audio_url", "not a url"],
    ["transcript_status", "queued"],
  ])("flags a bad %s", (field, value) => {
    expect(validateEvent({ ...validWedding, [field]: value })).toHaveProperty(
      field,
    )
  })

  it("keeps the date wording the UI already relied on", () => {
    expect(
      translated(
        validateEvent({ ...validWedding, event_date: "nope" }).event_date,
      ),
    ).toBe("Pick a date")
    expect(
      translated(
        validateEvent({ ...validWedding, application_deadline: "nope" })
          .application_deadline,
      ),
    ).toBe("Pick a deadline")
  })

  it("asks for the missing title in words a person can act on", () => {
    expect(
      translated(validateEvent({ ...validWedding, title: "  " }).title),
    ).toBe("Add a title")
  })

  it("knows a wedding by its two names", () => {
    expect(
      inWords(
        validateEvent({
          ...validWedding,
          details: { spouse_first_name_1: "Ada" },
        }).details,
      ),
    ).toEqual({ spouse_first_name_2: "Add a name" })

    expect(
      inWords(validateEvent({ ...validWedding, details: {} }).details),
    ).toEqual({
      spouse_first_name_1: "Add a name",
      spouse_first_name_2: "Add a name",
    })
  })

  it("knows a festival by its headliner", () => {
    expect(
      inWords(validateEvent({ ...validFestival, details: {} }).details),
    ).toEqual({
      headliner: "Add a headliner",
    })
  })

  it("checks the optional style against the taxonomy", () => {
    expect(
      inWords(
        validateEvent({
          ...validWedding,
          details: { ...validWedding.details, style: "x" },
        }).details,
      ),
    ).toEqual({ style: "Pick a style" })
    expect(
      validateEvent({
        ...validWedding,
        details: { ...validWedding.details, style: "classic" },
      }),
    ).toEqual({})
  })

  it("checks the optional genre against the taxonomy", () => {
    expect(
      inWords(
        validateEvent({
          ...validFestival,
          details: { headliner: "Nina", genre: "x" },
        }).details,
      ),
    ).toEqual({ genre: "Pick a genre" })
    expect(
      validateEvent({
        ...validFestival,
        details: { headliner: "Nina", genre: "jazz" },
      }),
    ).toEqual({})
  })

  it("rejects a category it knows nothing about", () => {
    const reunion = { ...validWedding, category: "reunion", details: {} }
    expect(inWords(validateEvent(reunion))).toEqual({
      category: "Pick a category",
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
    Object.entries(errors).map(([field, message]) => [
      field,
      translated(message),
    ]),
  )
}
