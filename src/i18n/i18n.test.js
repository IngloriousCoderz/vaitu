import { describe, expect, it } from "vitest"

const catalogues = import.meta.glob("./locales/*.json", { eager: true })
const english = catalogues["./locales/en.json"].default

describe("catalogues", () => {
  it.each(Object.entries(catalogues))("%s has every key", (_, catalogue) => {
    expect(keysOf(catalogue.default)).toEqual(keysOf(english))
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
