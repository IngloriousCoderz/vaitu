import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../api/push.js", () => ({
  isPushSupported: () => true,
  syncPushSubscription: vi.fn(async () => {}),
}))
vi.mock("@inglorious/web/mobile", () => ({ isNative: vi.fn(() => false) }))
// No DOM environment here: the pill itself is exercised live.
vi.mock("./template.js", () => ({ PushPromptBar: {} }))

import { createStore } from "@inglorious/store"
import { isNative } from "@inglorious/web/mobile"

import { syncPushSubscription } from "../../api/push.js"
import { PUSH_DECLINE_KEY } from "../../constants/index.js"
import { PushPrompt } from "./index.js"

let stored

beforeEach(() => {
  vi.clearAllMocks()
  stored = new Map()
  vi.stubGlobal("localStorage", {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  })
  vi.stubGlobal("window", globalThis)
  vi.stubGlobal("Notification", {
    permission: "default",
    requestPermission: vi.fn(async () => "granted"),
  })
})

function signIn() {
  const store = createStore({
    types: { PushPrompt },
    entities: { pushPrompt: { type: "PushPrompt" } },
  })
  store.notify("sessionStart")
  return store
}

describe("PushPrompt.sessionStart", () => {
  it("asks while the browser has not been answered", () => {
    expect(signIn().getState().pushPrompt.isOpen).toBe(true)
  })

  it("files the subscription without asking once allowed", async () => {
    Notification.permission = "granted"
    const store = signIn()
    expect(store.getState().pushPrompt.isOpen).toBe(false)
    await vi.waitFor(() => expect(syncPushSubscription).toHaveBeenCalled())
  })

  // The decline is about the pill, not about pushes: allowing them later in
  // the browser's settings still gets this browser its pushes.
  it("files the subscription once allowed, even after a decline", async () => {
    stored.set(PUSH_DECLINE_KEY, "true")
    Notification.permission = "granted"
    signIn()
    await vi.waitFor(() => expect(syncPushSubscription).toHaveBeenCalled())
  })

  it("stays quiet after a decline, or a refusal in the browser", () => {
    stored.set(PUSH_DECLINE_KEY, "true")
    expect(signIn().getState().pushPrompt.isOpen).toBe(false)

    stored.clear()
    Notification.permission = "denied"
    expect(signIn().getState().pushPrompt.isOpen).toBe(false)
  })

  it("does nothing in the native apps", () => {
    isNative.mockReturnValueOnce(true)
    expect(signIn().getState().pushPrompt.isOpen).toBe(false)
  })
})

describe("PushPrompt.ask", () => {
  it("files the subscription when the browser allows it", async () => {
    const store = signIn()
    store.notify("#pushPrompt:ask")
    expect(store.getState().pushPrompt.isOpen).toBe(false)
    await vi.waitFor(() => expect(syncPushSubscription).toHaveBeenCalled())
  })

  it("goes quiet when the browser refuses", async () => {
    Notification.requestPermission.mockResolvedValueOnce("denied")
    const store = signIn()
    store.notify("#pushPrompt:ask")
    await vi.waitFor(() =>
      expect(Notification.requestPermission).toHaveBeenCalled(),
    )
    expect(store.getState().pushPrompt.isOpen).toBe(false)
    expect(syncPushSubscription).not.toHaveBeenCalled()
  })
})

describe("PushPrompt.decline", () => {
  it("closes the pill for good on this browser", () => {
    const store = signIn()
    store.notify("#pushPrompt:decline")
    expect(store.getState().pushPrompt.isOpen).toBe(false)
    expect(signIn().getState().pushPrompt.isOpen).toBe(false)
  })
})

describe("PushPrompt.sessionEnd", () => {
  it("takes the pill down with the session", () => {
    const store = signIn()
    store.notify("sessionEnd")
    expect(store.getState().pushPrompt.isOpen).toBe(false)
  })
})
