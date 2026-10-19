import { describe, expect, it } from "vitest"

import { isProfileComplete } from "./profile.js"

const complete = {
  full_name: "Ada Grace",
  website: "example.com",
  instagram_handle: "@ada",
}

describe("isProfileComplete", () => {
  it("needs a name, a website and an Instagram handle", () => {
    expect(isProfileComplete(complete)).toBe(true)
    expect(isProfileComplete({ ...complete, full_name: "  " })).toBe(false)
    expect(isProfileComplete({ ...complete, website: "" })).toBe(false)
    expect(isProfileComplete({ ...complete, instagram_handle: "" })).toBe(false)
    expect(isProfileComplete(null)).toBe(false)
  })
})
