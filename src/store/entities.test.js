import { describe, expect, it } from "vitest"

import { entities } from "./entities.js"

describe("entities", () => {
  const selects = Object.entries(entities).filter(([, entity]) =>
    ["TranslatedCombobox", "LanguageSelect"].includes(entity.type),
  )

  it.each(selects)("%s tells its owner when it changes", (_, entity) => {
    expect(entity.changeEvent).toMatch(/^#\w+:\w+$/)
  })
})
