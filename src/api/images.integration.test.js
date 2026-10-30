import { describe, expect, it } from "vitest"

import { imageExtension, imageRefFromUrl } from "./images.js"

const BASE = "https://project.supabase.co/storage/v1/object/public"

describe("imageRefFromUrl", () => {
  it("reads an event image back as a bucket and path", () => {
    expect(imageRefFromUrl(`${BASE}/event-images/user-1/photo.jpg`)).toEqual({
      bucket: "event-images",
      path: "user-1/photo.jpg",
    })
  })

  it("reads an avatar from its own bucket", () => {
    expect(imageRefFromUrl(`${BASE}/avatars/user-1/avatar.jpg`)).toEqual({
      bucket: "avatars",
      path: "user-1/avatar.jpg",
    })
  })

  it("ignores query strings and decodes the path", () => {
    expect(
      imageRefFromUrl(`${BASE}/event-images/user-1/my%20photo.jpg?token=1`),
    ).toEqual({ bucket: "event-images", path: "user-1/my photo.jpg" })
  })

  it("leaves external and malformed URLs alone", () => {
    expect(imageRefFromUrl("https://example.com/avatar.jpg")).toBeNull()
    expect(imageRefFromUrl(null)).toBeNull()
    expect(imageRefFromUrl(`${BASE}/event-images/`)).toBeNull()
  })
})

describe("imageExtension", () => {
  it("maps the three accepted image types", () => {
    expect(imageExtension("image/jpeg")).toBe("jpg")
    expect(imageExtension("image/png")).toBe("png")
    expect(imageExtension("image/webp")).toBe("webp")
  })

  it("rejects everything else", () => {
    expect(imageExtension("image/gif")).toBeNull()
  })
})
