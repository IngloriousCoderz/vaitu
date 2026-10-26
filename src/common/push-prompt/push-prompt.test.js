import { createStore } from "@inglorious/store"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis
}

const { subscribeToPush, forgetCurrentPush } = vi.hoisted(() => ({
  subscribeToPush: vi.fn().mockResolvedValue(undefined),
  forgetCurrentPush: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../../api/push.js", () => ({
  subscribeToPush,
  forgetCurrentPush,
}))

vi.mock("@inglorious/web/mobile", () => ({
  isNative: () => false,
}))

describe("PushPrompt entity", () => {
  let store
  let originalNotification

  beforeEach(async () => {
    originalNotification = globalThis.Notification

    globalThis.Notification = class {
      static permission = "default"
      static requestPermission = vi.fn().mockResolvedValue("granted")
    }
    globalThis.window.Notification = globalThis.Notification
    globalThis.window.localStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }

    subscribeToPush.mockClear()
    forgetCurrentPush.mockClear()

    const { PushPrompt } = await import("./index.js")
    store = createStore({
      types: { PushPrompt },
      entities: { pushPrompt: { type: "PushPrompt" } },
      autoCreateEntities: true,
    })
  })

  afterEach(() => {
    globalThis.Notification = originalNotification
    if (globalThis.window) globalThis.window.Notification = originalNotification
    vi.resetModules()
  })

  function getEntity() {
    return store.getState().pushPrompt
  }

  it("create initializes flags", () => {
    const entity = getEntity()
    expect(entity.isReady).toBe(false)
    expect(entity.isBusy).toBe(false)
  })

  it("sessionStart with default permission sets isReady", () => {
    store.notify("#pushPrompt:sessionStart")
    expect(getEntity().isReady).toBe(true)
  })

  it("sessionStart with granted permission subscribes silently", async () => {
    globalThis.Notification.permission = "granted"
    store.notify("#pushPrompt:sessionStart")
    expect(getEntity().isReady).toBe(false)
    await vi.waitFor(() => expect(subscribeToPush).toHaveBeenCalled())
  })

  it("sessionStart with declined flag does nothing", () => {
    globalThis.window.localStorage.getItem.mockReturnValue("1")
    store.notify("#pushPrompt:sessionStart")
    expect(getEntity().isReady).toBe(false)
  })

  it("ask settles with permission and clears busy", async () => {
    store.notify("#pushPrompt:sessionStart")
    await store.notify("#pushPrompt:ask")
    expect(getEntity().isBusy).toBe(false)
    expect(getEntity().isReady).toBe(false)
  })

  it("ask does nothing when already busy", async () => {
    getEntity().isBusy = true
    await store.notify("#pushPrompt:ask")
    expect(globalThis.Notification.requestPermission).not.toHaveBeenCalled()
  })

  it("settle on grant subscribes", async () => {
    store.notify("#pushPrompt:settle", "granted")
    await vi.waitFor(() => expect(subscribeToPush).toHaveBeenCalled())
  })

  it("settle on denied does not subscribe", async () => {
    store.notify("#pushPrompt:settle", "denied")
    await vi.waitFor(() => expect(subscribeToPush).not.toHaveBeenCalled())
  })

  it("decline sets localStorage flag and hides pill", () => {
    store.notify("#pushPrompt:sessionStart")
    store.notify("#pushPrompt:decline")
    expect(globalThis.window.localStorage.setItem).toHaveBeenCalledWith(
      "vaitu-push-declined",
      "1",
    )
    expect(getEntity().isReady).toBe(false)
  })

  it("sessionEnd forgets current push", async () => {
    await store.notify("#pushPrompt:sessionEnd")
    expect(forgetCurrentPush).toHaveBeenCalled()
  })

  it("sessionStart on native returns early", async () => {
    vi.doMock("@inglorious/web/mobile", () => ({ isNative: () => true }))
    vi.resetModules()
    const { PushPrompt: NativePushPrompt } = await import("./index.js")
    const freshStore = createStore({
      types: { PushPrompt: NativePushPrompt },
      entities: { pushPrompt: { type: "PushPrompt" } },
      autoCreateEntities: true,
    })
    freshStore.notify("#pushPrompt:sessionStart")
    expect(freshStore.getState().pushPrompt.isReady).toBe(false)
  })
})
