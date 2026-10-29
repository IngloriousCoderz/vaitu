import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../api/push.js", () => ({
  isPushSupported: vi.fn(async () => true),
  pushPermission: vi.fn(async () => "prompt"),
  requestPushPermission: vi.fn(async () => "granted"),
  syncPushToken: vi.fn(async () => {}),
}))
// No DOM environment here: the pill itself is exercised live.
vi.mock("./template.js", () => ({ PushPromptBar: {} }))

import { createStore } from "@inglorious/store"

import {
  isPushSupported,
  pushPermission,
  requestPushPermission,
  syncPushToken,
} from "../../api/push.js"
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
})

// Signs in and lets the device answer whether it may show pushes.
async function signIn() {
  const store = createStore({
    types: { PushPrompt },
    entities: { pushPrompt: { type: "PushPrompt" } },
  })
  store.notify("sessionStart")
  await settle()
  return store
}

function settle() {
  return new Promise((resolve) => setTimeout(resolve))
}

describe("PushPrompt.sessionStart", () => {
  it("asks while the device has not been answered", async () => {
    expect((await signIn()).getState().pushPrompt.isOpen).toBe(true)
  })

  it("files the token without asking once allowed", async () => {
    pushPermission.mockResolvedValueOnce("granted")
    const store = await signIn()
    expect(store.getState().pushPrompt.isOpen).toBe(false)
    expect(syncPushToken).toHaveBeenCalled()
  })

  // The decline is about the pill, not about pushes: allowing them later in
  // the system's settings still gets this device its pushes.
  it("files the token once allowed, even after a decline", async () => {
    stored.set(PUSH_DECLINE_KEY, "true")
    pushPermission.mockResolvedValueOnce("granted")
    await signIn()
    expect(syncPushToken).toHaveBeenCalled()
  })

  it("stays quiet after a decline, or a refusal on the device", async () => {
    stored.set(PUSH_DECLINE_KEY, "true")
    expect((await signIn()).getState().pushPrompt.isOpen).toBe(false)

    stored.clear()
    pushPermission.mockResolvedValueOnce("denied")
    expect((await signIn()).getState().pushPrompt.isOpen).toBe(false)
  })

  it("stays quiet where pushes are not supported", async () => {
    isPushSupported.mockResolvedValueOnce(false)
    expect((await signIn()).getState().pushPrompt.isOpen).toBe(false)
    expect(pushPermission).not.toHaveBeenCalled()
  })

  it("stays quiet for a sign-out that lands before the answer", async () => {
    const store = createStore({
      types: { PushPrompt },
      entities: { pushPrompt: { type: "PushPrompt" } },
    })
    store.notify("sessionStart")
    store.notify("sessionEnd")
    await settle()
    expect(store.getState().pushPrompt.isOpen).toBe(false)
  })
})

describe("PushPrompt.ask", () => {
  it("files the token when the device allows it", async () => {
    const store = await signIn()
    store.notify("#pushPrompt:ask")
    expect(store.getState().pushPrompt.isOpen).toBe(false)
    await vi.waitFor(() => expect(syncPushToken).toHaveBeenCalled())
  })

  it("goes quiet when the device refuses", async () => {
    requestPushPermission.mockResolvedValueOnce("denied")
    const store = await signIn()
    store.notify("#pushPrompt:ask")
    await settle()
    expect(requestPushPermission).toHaveBeenCalled()
    expect(store.getState().pushPrompt.isOpen).toBe(false)
    expect(syncPushToken).not.toHaveBeenCalled()
  })
})

describe("PushPrompt.decline", () => {
  it("closes the pill for good on this device", async () => {
    const store = await signIn()
    store.notify("#pushPrompt:decline")
    expect(store.getState().pushPrompt.isOpen).toBe(false)
    expect((await signIn()).getState().pushPrompt.isOpen).toBe(false)
  })
})

describe("PushPrompt.sessionEnd", () => {
  it("takes the pill down with the session", async () => {
    const store = await signIn()
    store.notify("sessionEnd")
    expect(store.getState().pushPrompt.isOpen).toBe(false)
  })
})
