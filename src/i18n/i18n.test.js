import { describe, expect, it } from "vitest"

import { translated } from "./index.js"

const catalogues = import.meta.glob("./locales/*.json", { eager: true })
const english = catalogues["./locales/en.json"].default

describe("catalogues", () => {
  // English is the fallback, so a key missing elsewhere still shows: in
  // English, on a page that is otherwise in another language. Plural forms
  // differ by language (Italian and French add `_many`), so they compare by
  // the key they pluralise.
  it.each(Object.entries(catalogues))("%s has every key", (_, catalogue) => {
    expect(keysOf(catalogue.default)).toEqual(keysOf(english))
  })
})

describe("translated", () => {
  it("reads a key kept in state in the current language", () => {
    expect(translated("validation.addTitle")).toBe(english.validation.addTitle)
  })

  it("interpolates a key that carries values", () => {
    expect(translated({ key: "errors.imageLimit", values: { count: 6 } })).toBe(
      "You can add up to 6 photos",
    )
  })

  it("shows a message from the server as it came", () => {
    expect(translated("Invalid login credentials")).toBe(
      "Invalid login credentials",
    )
  })

  it("leaves no message as none", () => {
    expect(translated(null)).toBeNull()
  })
})

function keysOf(catalogue, prefix = "") {
  const keys = Object.entries(catalogue).flatMap(([key, value]) =>
    typeof value === "object"
      ? keysOf(value, `${prefix}${key}.`)
      : [`${prefix}${key.replace(/_(zero|one|two|few|many|other)$/, "")}`],
  )
  return [...new Set(keys)].sort()
}
