import { afterEach, describe, expect, it, vi } from "vitest"

import { randomId } from "./index.js"

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe("randomId", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("builds a version 4 UUID where crypto.randomUUID is missing", () => {
    const real = globalThis.crypto
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes) => real.getRandomValues(bytes),
    })

    expect(randomId()).toMatch(UUID_V4)
  })
})
