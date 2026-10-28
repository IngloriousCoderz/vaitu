import { describe, expect, it } from "vitest"

import { feedQuery, localToday } from "./query.js"

const defaults = {
  query: "",
  types: [],
  details: [],
  interests: [],
  region: null,
  period: "all",
  favoriteRegions: [],
  regions: ["Toscana", "Tuscany", "Provence", "Sicily"],
  sort: "created_desc",
  today: "2026-10-28",
}

function query(fields = {}) {
  return feedQuery({ ...defaults, ...fields })
}

describe("feedQuery", () => {
  it("asks for everything, newest first, when nothing is picked", () => {
    expect(query()).toEqual({
      categories: [],
      details: [],
      regions: null,
      dateFrom: null,
      dateTo: null,
      search: "",
      order: [["created_at", false]],
    })
  })

  it("scopes the categories to the picked ones, a picked genre's, or the interests", () => {
    expect(query({ interests: ["wedding"] }).categories).toEqual(["wedding"])
    expect(query({ types: ["festival"] }).categories).toEqual(["festival"])
    expect(query({ details: ["techno"] }).categories).toEqual(["festival"])
  })

  it("groups the picked styles and genres by the detail they filter", () => {
    expect(query({ details: ["editorial", "techno", "jazz"] }).details).toEqual(
      [
        { key: "style", category: "wedding", values: ["editorial"] },
        { key: "genre", category: "festival", values: ["techno", "jazz"] },
      ],
    )
  })

  it("asks for every stored spelling of a region, and of each favorite", () => {
    expect(query({ region: "Tuscany" }).regions).toEqual(["Toscana", "Tuscany"])
    expect(query({ favoriteRegions: ["Toscana", "Sicily"] }).regions).toEqual([
      "Toscana",
      "Tuscany",
      "Sicily",
    ])
    expect(query({ favoriteRegions: ["Sicily"], region: "all" }).regions).toBe(
      null,
    )
  })

  it("asks for no region at all when the picked one is on no open event", () => {
    expect(query({ region: "Lombardy" }).regions).toEqual([])
  })

  it("turns a period into dates from today", () => {
    const week = query({ period: "week" })
    expect([week.dateFrom, week.dateTo]).toEqual(["2026-10-28", "2026-11-04"])
  })

  it("trims, lowercases and drops accents from the search", () => {
    expect(query({ query: "  Florence " }).search).toBe("florence")
    expect(query({ query: "Forlì" }).search).toBe("forli")
  })

  it("sorts by the picked column, and newest first for an unknown sort", () => {
    expect(query({ sort: "deadline_asc" }).order).toEqual([
      ["application_deadline", true],
    ])
    expect(query({ sort: "nope" }).order).toEqual([["created_at", false]])
  })
})

describe("localToday", () => {
  it("is the date in the visitor's calendar", () => {
    const noonLocal = new Date(2026, 9, 28, 12)
    expect(localToday(noonLocal)).toBe("2026-10-28")
  })
})
