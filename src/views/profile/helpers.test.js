import { describe, expect, it } from "vitest"

import {
  displayInstagram,
  displayWebsite,
  initials,
  instagramUrl,
} from "./helpers.js"

describe("initials", () => {
  it("uses the first and last words, and a question mark when the name is empty", () => {
    expect(initials("Ada")).toBe("A")
    expect(initials("Ada Grace")).toBe("AG")
    expect(initials("  Ada   Grace Hopper  ")).toBe("AH")
    expect(initials("")).toBe("?")
    expect(initials(null)).toBe("?")
  })
})

describe("displayWebsite", () => {
  it("adds https when the address has no scheme", () => {
    expect(displayWebsite("  example.com ")).toBe("https://example.com")
    expect(displayWebsite("HTTP://example.com")).toBe("HTTP://example.com")
    expect(displayWebsite("")).toBe("")
  })
})

describe("instagram", () => {
  it("shows a single @ and builds the profile url", () => {
    expect(displayInstagram("  @@ada ")).toBe("@ada")
    expect(displayInstagram("")).toBe("")
    expect(instagramUrl("@ada")).toBe("https://instagram.com/ada")
    expect(instagramUrl("")).toBe(null)
  })
})
