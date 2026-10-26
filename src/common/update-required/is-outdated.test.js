import { describe, expect, it } from "vitest"

import { isOutdated } from "./is-outdated.js"

describe("isOutdated", () => {
  it("closes on a build below the minimum", () => {
    expect(isOutdated(3, { min_build: 4 })).toBe(true)
  })

  it("lets the minimum itself and anything newer through", () => {
    expect(isOutdated(4, { min_build: 4 })).toBe(false)
    expect(isOutdated(5, { min_build: 4 })).toBe(false)
  })

  it("lets through when there is no clear answer", () => {
    expect(isOutdated(3, null)).toBe(false)
    expect(isOutdated(Number("web"), { min_build: 4 })).toBe(false)
  })
})
