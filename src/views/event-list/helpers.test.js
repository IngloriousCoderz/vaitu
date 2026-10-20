import { describe, expect, it } from "vitest"

import {
  DEFAULT_SORT,
  distinctRegions,
  sortEvents,
  visibleEvents,
} from "./helpers.js"

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

function show(events, fields = {}) {
  return visibleEvents(
    events,
    fields.query ?? "",
    fields.category ?? "wedding",
    fields.filter ?? "all",
    fields.region ?? "all",
    fields.period ?? "all",
    fields.favorites ?? [],
  ).map((item) => item.title)
}

describe("visibleEvents", () => {
  it("keeps the active category and the chosen style or genre", () => {
    const events = [wedding, festival]
    expect(show(events)).toEqual(["Ada & Grace"])
    expect(show(events, { filter: "editorial" })).toEqual(["Ada & Grace"])
    expect(show(events, { filter: "classic" })).toEqual([])
    expect(show(events, { category: "festival", filter: "jazz" })).toEqual([
      "Jazz Open",
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
    expect(show(events, { query: "arles", category: "festival" })).toEqual([
      "Jazz Open",
    ])
    expect(show(events, { query: "missing" })).toEqual([])
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
