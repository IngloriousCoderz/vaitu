import { describe, expect, it } from "vitest"

import { linkedLocale } from "./linked-locale.js"

const LOCALES = ["en", "it"]

describe("linkedLocale", () => {
  it("reads a language the app has", () => {
    expect(linkedLocale("?lang=it", LOCALES)).toBe("it")
    expect(linkedLocale("?token=x&lang=en", LOCALES)).toBe("en")
  })

  it("ignores anything else", () => {
    expect(linkedLocale("", LOCALES)).toBeNull()
    expect(linkedLocale("?lang=de", LOCALES)).toBeNull()
  })
})
