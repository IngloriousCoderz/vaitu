import { describe, expect, it } from "vitest"

import {
  activeFilters,
  DEFAULT_SORT,
  defaultRegion,
  distinctRegions,
  regionInEffect,
  sortEvents,
  typesInScope,
  visibleEvents,
} from "./helpers.js"

const wedding = event({})
const festival = event({
  category: "festival",
  filterValue: "jazz",
  region: "Provence",
  eventInDays: 40,
  title: "Jazz Open",
  subtitle: "Arles • Provence • 02 Jun",
})
const soon = event({ title: "Soon", eventInDays: 7, region: "Lombardy" })
const later = event({ title: "Later", eventInDays: 8 })
const past = event({ title: "Past", eventInDays: -1, region: "Sicily" })

describe("visibleEvents", () => {
  it("shows every category until some are picked", () => {
    const events = [wedding, festival]
    expect(show(events)).toEqual(["Ada & Grace", "Jazz Open"])
    expect(show(events, { types: ["festival"] })).toEqual(["Jazz Open"])
    expect(show(events, { types: ["wedding", "festival"] })).toEqual([
      "Ada & Grace",
      "Jazz Open",
    ])
  })

  it("narrows a category to its picked styles or genres, and brings it in", () => {
    const events = [wedding, festival]
    expect(show(events, { details: ["jazz"] })).toEqual(["Jazz Open"])
    expect(show(events, { details: ["classic"] })).toEqual([])
    expect(show(events, { types: ["wedding"], details: ["jazz"] })).toEqual([
      "Ada & Grace",
      "Jazz Open",
    ])
    expect(show(events, { details: ["editorial", "techno"] })).toEqual([
      "Ada & Grace",
    ])
  })

  it("matches a region by either spelling, and favorites when the choice is mine", () => {
    const events = [wedding, festival]
    expect(show(events, { region: "Toscana" })).toEqual(["Ada & Grace"])
    expect(show(events, { region: "mine", favorites: ["Toscana"] })).toEqual([
      "Ada & Grace",
    ])
    expect(show(events, { region: "mine" })).toEqual([])
  })

  it("limits a period to today through its last day, and an unknown period shows everything", () => {
    const events = [wedding, soon, later, past]
    expect(show(events, { period: "week" })).toEqual(["Ada & Grace", "Soon"])
    expect(show(events, { period: "nope" })).toEqual([
      "Ada & Grace",
      "Soon",
      "Later",
      "Past",
    ])
  })

  it("searches the title and the subtitle, ignoring case and surrounding spaces", () => {
    const events = [wedding, festival]
    expect(show(events, { query: "  ADA " })).toEqual(["Ada & Grace"])
    expect(show(events, { query: "florence" })).toEqual(["Ada & Grace"])
    expect(show(events, { query: "arles" })).toEqual(["Jazz Open"])
    expect(show(events, { query: "missing" })).toEqual([])
  })
})

describe("typesInScope", () => {
  it("adds the category of each picked style or genre, once", () => {
    expect(typesInScope([], [])).toEqual([])
    expect(typesInScope([], ["techno", "jazz"])).toEqual(["festival"])
    expect(typesInScope(["wedding"], ["editorial"])).toEqual(["wedding"])
  })

  it("falls back to the profile's interests only while nothing is picked", () => {
    expect(typesInScope([], [], ["wedding"])).toEqual(["wedding"])
    expect(typesInScope(["festival"], [], ["wedding"])).toEqual(["festival"])
    expect(typesInScope([], ["techno"], ["wedding"])).toEqual(["festival"])
  })
})

describe("the default region", () => {
  it("is your favorites once you have some, and stands in while none is picked", () => {
    expect(defaultRegion([])).toBe("all")
    expect(defaultRegion(["Tuscany"])).toBe("mine")
    expect(regionInEffect(null, ["Tuscany"])).toBe("mine")
    expect(regionInEffect("Sicily", ["Tuscany"])).toBe("Sicily")
  })
})

describe("activeFilters", () => {
  const base = { types: [], details: [], region: null, period: "all" }
  const regions = [
    { id: "all", label: "All regions" },
    { id: "Sicily", label: "Sicily" },
  ]

  it("shows nothing for the defaults", () => {
    expect(activeFilters({ ...base, regions })).toEqual([])
  })

  it("lists what is on, in the sheet's order", () => {
    const active = activeFilters({
      types: ["festival"],
      details: ["techno"],
      region: "Sicily",
      period: "week",
      regions,
    })
    expect(active.map(({ kind, id }) => `${kind}:${id}`)).toEqual([
      "type:festival",
      "detail:techno",
      "region:Sicily",
      "period:week",
    ])
  })
})

describe("distinctRegions", () => {
  it("returns each region once, under the stored name, in alphabetical order", () => {
    expect(
      distinctRegions([
        { region: "Tuscany" },
        { region: "Toscana" },
        { region: "" },
        { region: "Lombardia" },
      ]),
    ).toEqual(["Lombardy", "Tuscany"])
  })
})

describe("sortEvents", () => {
  const early = {
    id: "a",
    title: "Early",
    event_date: "2026-01-10",
    application_deadline: "2026-01-01T12:00:00Z",
    created_at: "2025-12-01T12:00:00Z",
  }
  const late = {
    id: "b",
    title: "Late",
    event_date: "2026-06-10",
    application_deadline: "2026-05-01T12:00:00Z",
    created_at: "2026-01-15T12:00:00Z",
  }

  it("defaults to created newest first", () => {
    expect(DEFAULT_SORT).toBe("created_desc")
    expect(sortEvents([early, late]).map((e) => e.title)).toEqual([
      "Late",
      "Early",
    ])
  })

  it("orders by event date, deadline, or created_at", () => {
    const events = [late, early]
    expect(sortEvents(events, "event_date_asc").map((e) => e.title)).toEqual([
      "Early",
      "Late",
    ])
    expect(sortEvents(events, "event_date_desc").map((e) => e.title)).toEqual([
      "Late",
      "Early",
    ])
    expect(sortEvents(events, "deadline_asc").map((e) => e.title)).toEqual([
      "Early",
      "Late",
    ])
    expect(sortEvents(events, "deadline_desc").map((e) => e.title)).toEqual([
      "Late",
      "Early",
    ])
    expect(sortEvents(events, "created_asc").map((e) => e.title)).toEqual([
      "Early",
      "Late",
    ])
    expect(sortEvents(events, "created_desc").map((e) => e.title)).toEqual([
      "Late",
      "Early",
    ])
  })
})

function event(fields) {
  return {
    category: "wedding",
    filterValue: "editorial",
    region: "Tuscany",
    eventInDays: 3,
    title: "Ada & Grace",
    subtitle: "Florence • Tuscany • 24 Oct",
    ...fields,
  }
}

function show(events, fields = {}) {
  return visibleEvents(events, {
    ...fields,
    favoriteRegions: fields.favorites,
  }).map((item) => item.title)
}
