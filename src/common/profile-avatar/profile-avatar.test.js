import { describe, expect, it } from "vitest"

import { initials } from "./index.js"

describe("initials", () => {
  it("uses the first and last words, and a question mark when the name is empty", () => {
    expect(initials("Ada")).toBe("A")
    expect(initials("Ada Grace")).toBe("AG")
    expect(initials("  Ada   Grace Hopper  ")).toBe("AH")
    expect(initials("")).toBe("?")
    expect(initials(null)).toBe("?")
  })
})
