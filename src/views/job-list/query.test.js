import { describe, expect, it } from "vitest"

import { availableJobTypes } from "../../data/job-taxonomy.js"
import { feedQuery, localToday } from "./query.js"

const defaults = {
  query: "",
  details: [],
  activeSettings: [],
  mySettings: [],
  activeProfessions: [],
  myProfessions: [],
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
  it("asks for everything on offer, newest first, when nothing is picked", () => {
    expect(query()).toEqual({
      jobTypes: availableJobTypes.map((jobType) => jobType.id),
      details: [],
      regions: null,
      dateFrom: null,
      dateTo: null,
      search: "",
      order: [["created_at", false]],
      scope: {
        openJobs: "all",
        appliedJobIds: [],
        wonJobIds: [],
        wonFrom: "2026-10-28",
      },
    })
  })

  it("shows open jobs and won ones, narrowed by status", () => {
    const ids = { appliedJobIds: ["a", "w"], wonJobIds: ["w"] }
    const scope = (status) => query({ ...ids, status }).scope
    expect(scope("all")).toMatchObject({ openJobs: "all", wonJobIds: ["w"] })
    expect(scope("open")).toMatchObject({
      openJobs: "notApplied",
      wonJobIds: [],
    })
    expect(scope("applied")).toMatchObject({
      openJobs: "applied",
      appliedJobIds: ["a", "w"],
      wonJobIds: [],
    })
    expect(scope("won")).toMatchObject({ openJobs: "none", wonJobIds: ["w"] })
  })

  it("scopes the job types to the picked settings, or else yours, and a style's", () => {
    expect(query({ mySettings: ["wedding"] }).jobTypes).toEqual(
      availableJobTypes.map((jobType) => jobType.id),
    )
    expect(
      query({ activeSettings: ["wedding"], activeProfessions: ["dj"] })
        .jobTypes,
    ).toEqual(["wedding_dj"])
    expect(query({ details: ["editorial"] }).jobTypes).toContain(
      "wedding_photographer",
    )
    expect(query({ details: ["editorial"] }).jobTypes).not.toContain(
      "wedding_dj",
    )
  })

  it("scopes the job types to the picked professions, or else your own", () => {
    expect(query({ myProfessions: ["planner"] }).jobTypes).toEqual([
      "wedding_planner",
    ])
    expect(
      query({ myProfessions: ["planner"], activeProfessions: ["dj"] }).jobTypes,
    ).toEqual(["wedding_dj"])
  })

  it("groups the picked details by the field they filter", () => {
    expect(
      query({ details: ["editorial", "ceremony", "techno", "jazz"] }).details,
    ).toEqual([
      { key: "styles", settings: ["wedding"], values: ["editorial"] },
      { key: "moments", settings: ["wedding"], values: ["ceremony"] },
      {
        key: "genres",
        settings: ["wedding", "festival", "concert"],
        values: ["techno", "jazz"],
      },
    ])
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

  it("asks for no region at all when the picked one is on no open job", () => {
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
