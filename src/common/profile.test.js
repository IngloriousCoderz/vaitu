import { describe, expect, it } from "vitest"

import {
  isProfileComplete,
  mailtoUrl,
  telUrl,
  websiteLabel,
} from "./profile.js"

const complete = {
  full_name: "Ada Grace",
  website: "example.com",
  phone: "+39 333 000 0000",
}

describe("isProfileComplete", () => {
  it("needs a name and a way to be reached", () => {
    expect(isProfileComplete(complete)).toBe(true)
    expect(isProfileComplete({ ...complete, full_name: "  " })).toBe(false)
    expect(isProfileComplete({ ...complete, website: "" })).toBe(true)
    expect(isProfileComplete({ ...complete, phone: "" })).toBe(true)
    expect(isProfileComplete({ ...complete, website: "", phone: " " })).toBe(
      false,
    )
    expect(isProfileComplete(null)).toBe(false)
  })
})

describe("mailtoUrl", () => {
  it("encodes the subject and the body", () => {
    expect(
      mailtoUrl("a@example.com", { subject: "New type", body: "One\n& two" }),
    ).toBe("mailto:a@example.com?subject=New%20type&body=One%0A%26%20two")
  })
})

describe("telUrl", () => {
  it("drops the spaces, and is null without a number", () => {
    expect(telUrl("+39 333 000 0000")).toBe("tel:+393330000000")
    expect(telUrl("")).toBeNull()
    expect(telUrl(null)).toBeNull()
  })
})

describe("websiteLabel", () => {
  it("shows the address without its scheme, www or trailing slash", () => {
    expect(websiteLabel("https://www.example.com/")).toBe("example.com")
    expect(websiteLabel(" HTTP://instagram.com/ada.photo ")).toBe(
      "instagram.com/ada.photo",
    )
    expect(websiteLabel(null)).toBe("")
  })
})
