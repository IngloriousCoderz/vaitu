import { describe, expect, it, vi } from "vitest"

import { legalUrl } from "./legal-links.js"

vi.stubEnv("VITE_SITE_URL", "https://www.example.net")

describe("legalUrl", () => {
  it("adds the language, except for the site's default one", () => {
    expect(legalUrl("privacy", "it")).toBe("https://www.example.net/it/privacy")
    expect(legalUrl("terms", "en")).toBe("https://www.example.net/terms")
  })
})
