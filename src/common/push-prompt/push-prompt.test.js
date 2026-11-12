import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../api/push.js", () => ({
  push: {
    isSupported: vi.fn(async () => true),
    permission: vi.fn(async () => "prompt"),
    request: vi.fn(async () => "granted"),
    register: vi.fn(async () => {}),
  },
}))

import { createStore } from "@inglorious/store"

import { PUSH_STORAGE_KEY } from "../../constants/index.js"
import { PushPrompt } from "./index.js"

let stored

beforeEach(() => {
  stored = new Map()
  vi.stubGlobal("localStorage", {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  })
})

function settle() {
  return new Promise((resolve) => setTimeout(resolve))
}

function storeWithPrompt() {
  return createStore({
    types: { PushPrompt },
    entities: { pushPrompt: { type: "PushPrompt" } },
  })
}

describe("PushPrompt", () => {
  it("opens at sign-in and closes at sign-out", async () => {
    const store = storeWithPrompt()
    store.notify("sessionStart")
    await settle()
    expect(store.getState().pushPrompt.isOpen).toBe(true)

    store.notify("sessionEnd")
    expect(store.getState().pushPrompt.isOpen).toBe(false)
  })

  it("keeps a decline under the app's key, and stays closed next time", async () => {
    const store = storeWithPrompt()
    store.notify("sessionStart")
    await settle()
    store.notify("#pushPrompt:pushDecline")
    expect(JSON.parse(stored.get(PUSH_STORAGE_KEY))).toEqual({
      isDeclined: true,
    })

    const next = storeWithPrompt()
    next.notify("sessionStart")
    await settle()
    expect(next.getEntity("pushPrompt").isOpen).toBe(false)
  })
})
