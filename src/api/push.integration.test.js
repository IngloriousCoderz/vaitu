import { createStore } from "@inglorious/store"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./client.js", () => ({
  supabase: {
    from: vi.fn(() => ({ upsert: vi.fn(), delete: vi.fn() })),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
      }),
    },
  },
}))

vi.mock("@inglorious/web/mobile", () => ({
  isNative: () => false,
}))

describe("Push integration: entity + api", () => {
  let store
  let entity
  let originalNotification
  let originalSW
  let mockSubscribe
  let mockGetSubscription
  let mockFrom
  let mockUpsert
  let mockDelete

  beforeEach(async () => {
    originalNotification = globalThis.Notification
    originalSW = navigator.serviceWorker

    globalThis.Notification = class {
      static permission = "default"
      static requestPermission = vi.fn().mockResolvedValue("granted")
    }

    mockSubscribe = vi.fn().mockResolvedValue({
      endpoint: "https://push.example.com/abc",
      toJSON: () => ({ keys: { p256dh: "key1", auth: "key2" } }),
    })
    mockGetSubscription = vi.fn().mockResolvedValue({
      endpoint: "https://push.example.com/abc",
    })
    mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockDelete = vi.fn().mockResolvedValue({ error: null })
    mockFrom = vi.fn(() => ({ upsert: mockUpsert, delete: mockDelete }))

    navigator.serviceWorker = {
      ready: Promise.resolve({
        pushManager: {
          subscribe: mockSubscribe,
          getSubscription: mockGetSubscription,
        },
      }),
    }

    const { supabase } = await import("./client.js")
    supabase.from = mockFrom

    const { PushPrompt } = await import("../common/push-prompt/index.js")
    store = createStore({ pushPrompt: PushPrompt })
    entity = store.getEntity("pushPrompt")
  })

  afterEach(() => {
    globalThis.Notification = originalNotification
    navigator.serviceWorker = originalSW
    vi.resetModules()
  })

  it("sessionStart -> ask -> settle(granted) -> subscribe called", async () => {
    store.notify("#pushPrompt:sessionStart")
    expect(entity.isReady).toBe(true)

    await store.notify("#pushPrompt:ask")
    expect(entity.isBusy).toBe(false)
    expect(entity.isReady).toBe(false)

    await vi.waitFor(() => expect(mockSubscribe).toHaveBeenCalled())
  })

  it("sessionStart -> ask -> settle(denied) -> no subscribe", async () => {
    globalThis.Notification.requestPermission.mockResolvedValue("denied")
    store.notify("#pushPrompt:sessionStart")
    await store.notify("#pushPrompt:ask")
    await vi.waitFor(() => expect(mockSubscribe).not.toHaveBeenCalled())
  })

  it("decline sets flag and hides pill; next sessionStart stays hidden", async () => {
    store.notify("#pushPrompt:sessionStart")
    expect(entity.isReady).toBe(true)
    store.notify("#pushPrompt:decline")
    expect(entity.isReady).toBe(false)

    vi.resetModules()
    const { supabase } = await import("./client.js")
    supabase.from = mockFrom
    const { PushPrompt: PushPrompt2 } =
      await import("../common/push-prompt/index.js")
    const store2 = createStore({ pushPrompt: PushPrompt2 })
    const entity2 = store2.getEntity("pushPrompt")
    store2.notify("#pushPrompt:sessionStart")
    expect(entity2.isReady).toBe(false)
  })

  it("sessionEnd calls forgetCurrentPush", async () => {
    await store.notify("#pushPrompt:sessionEnd")
    expect(mockGetSubscription).toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalled()
  })
})
