import { describe, expect, it } from "vitest"

import { deepgramLanguage } from "../../supabase/functions/transcribe-audio/language.ts"

describe("deepgramLanguage", () => {
  it.each(["en", "fr", "it", "ja"])("names %s", (locale) => {
    expect(deepgramLanguage(locale)).toBe(locale)
  })

  it("ignores the region of a locale", () => {
    expect(deepgramLanguage("it-IT")).toBe("it")
  })

  it.each(["ar", "de", "", null, undefined, 42])(
    "detects the language for %s",
    (locale) => {
      expect(deepgramLanguage(locale)).toBe("multi")
    },
  )
})
