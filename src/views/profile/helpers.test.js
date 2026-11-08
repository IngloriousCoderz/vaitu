import { describe, expect, it } from "vitest"

import { displayWebsite } from "./helpers.js"

describe("displayWebsite", () => {
  it("adds https when the address has no scheme", () => {
    expect(displayWebsite("  example.com ")).toBe("https://example.com")
    expect(displayWebsite("HTTP://example.com")).toBe("HTTP://example.com")
    expect(displayWebsite("")).toBe("")
  })
})
