import { Buffer } from "node:buffer"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis
}
if (typeof globalThis.atob === "undefined") {
  globalThis.atob = (str) => Buffer.from(str, "base64").toString("binary")
}

vi.mock("./client.js", () => {
  const mockFrom = vi.fn(() => ({ upsert: vi.fn(), delete: vi.fn() }))
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
        }),
      },
    },
    __mockFrom: mockFrom,
  }
})

const mockSubscribe = vi.fn().mockResolvedValue({
  endpoint: "https://push.example.com/abc",
  toJSON: () => ({ keys: { p256dh: "key1", auth: "key2" } }),
})
const mockGetSubscription = vi.fn().mockResolvedValue({
  endpoint: "https://push.example.com/abc",
})
const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockDelete = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ upsert: mockUpsert, delete: mockDelete }))

Object.defineProperty(globalThis.navigator, "serviceWorker", {
  value: {
    ready: Promise.resolve({
      pushManager: {
        subscribe: mockSubscribe,
        getSubscription: mockGetSubscription,
      },
    }),
  },
  writable: true,
  configurable: true,
})

import.meta.env.VITE_VAPID_PUBLIC_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"

describe("api/push", () => {
  beforeEach(async () => {
    mockSubscribe.mockClear()
    mockGetSubscription.mockClear()
    mockUpsert.mockClear()
    mockDelete.mockClear()
    mockFrom.mockClear()

    const clientModule = await import("./client.js")
    clientModule.supabase.from = mockFrom
  })

  afterEach(() => {
    vi.resetModules()
  })

  it("navigator.serviceWorker is mocked", async () => {
    const reg = await navigator.serviceWorker.ready
    expect(reg).toBeDefined()
    expect(reg.pushManager).toBeDefined()
    expect(typeof reg.pushManager.subscribe).toBe("function")
  })

  it("subscribeToPush upserts subscription row", async () => {
    const { subscribeToPush } = await import("./push.js")
    await subscribeToPush()
    expect(mockSubscribe).toHaveBeenCalled()
    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions")
    const upsertCall = mockUpsert.mock.calls[0][0]
    expect(upsertCall.endpoint).toBe("https://push.example.com/abc")
    expect(upsertCall.user_id).toBe("user-123")
  })

  it("forgetCurrentPush deletes endpoint row", async () => {
    mockGetSubscription.mockResolvedValue({
      endpoint: "https://push.example.com/abc",
    })
    const { forgetCurrentPush } = await import("./push.js")
    await forgetCurrentPush()
    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions")
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith(
      "endpoint",
      "https://push.example.com/abc",
    )
  })

  it("forgetCurrentPush does nothing when no subscription", async () => {
    mockGetSubscription.mockResolvedValue(null)
    const { forgetCurrentPush } = await import("./push.js")
    await forgetCurrentPush()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("urlBase64ToUint8Array decodes correctly", async () => {
    const { urlBase64ToUint8Array } = await import("./push.js")
    const input = "YWJj"
    const out = urlBase64ToUint8Array(input)
    expect(out).toEqual(new Uint8Array([97, 98, 99]))
  })

  it("urlBase64ToUint8Array handles padding", async () => {
    const { urlBase64ToUint8Array } = await import("./push.js")
    const input = "YWJjZA"
    const out = urlBase64ToUint8Array(input)
    expect(out).toEqual(new Uint8Array([97, 98, 99, 100]))
  })
})
