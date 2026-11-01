import { describe, expect, it, vi } from "vitest"

import { legalUrl } from "./legal-links.js"

vi.stubEnv("VITE_SITE_URL", "https://www.example.net")

describe("legalUrl", () => {
  it("adds the language, except for the site's default one", () => {
    expect(legalUrl("privacy", "en")).toBe("https://www.example.net/en/privacy")
    expect(legalUrl("terms", "ar")).toBe("https://www.example.net/ar/terms")
    expect(legalUrl("terms", "it")).toBe("https://www.example.net/terms")
  })
})
