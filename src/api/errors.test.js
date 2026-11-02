import { afterEach, describe, expect, it, vi } from "vitest"

import { errorKey } from "./errors.js"

describe("errorKey", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("says offline when the server couldn't be reached", () => {
    expect(
      errorKey({ message: "TypeError: Failed to fetch" }, "errors.loadEvents"),
    ).toBe("errors.offline")
    vi.stubGlobal("navigator", { onLine: false })
    expect(errorKey(new Error("boom"), "errors.loadEvents")).toBe(
      "errors.offline",
    )
  })

  it("keeps the error's own message, else the fallback", () => {
    expect(errorKey(new Error("errors.voiceLimit"), "errors.save")).toBe(
      "errors.voiceLimit",
    )
    expect(errorKey({}, "errors.save")).toBe("errors.save")
  })
})
