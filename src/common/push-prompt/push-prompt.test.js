import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../api/push.js", () => ({
  push: {
    isSupported: vi.fn(async () => true),
    permission: vi.fn(async () => "prompt"),
    request: vi.fn(async () => "granted"),
    register: vi.fn(async () => {}),
  },
}))
// No DOM environment here: the pill itself is exercised live.
vi.mock("./template.js", () => ({ PushPromptBar: {} }))

import { createStore } from "@inglorious/store"

import { PUSH_DECLINE_KEY } from "../../constants/index.js"
import { PushPrompt } from "./index.js"

let stored

beforeEach(() => {
  stored = new Map()
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
    },
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

// How the pill behaves is createPushPrompt's, tested in @inglorious/web;
// here, only that the session drives it, with this app's decline key.
describe("PushPrompt", () => {
  it("opens at sign-in and closes at sign-out", async () => {
    const store = storeWithPrompt()
    store.notify("sessionStart")
    await settle()
    expect(store.getState().pushPrompt.isOpen).toBe(true)

    store.notify("sessionEnd")
    expect(store.getState().pushPrompt.isOpen).toBe(false)
  })

  it("remembers a decline under the app's key", async () => {
    const store = storeWithPrompt()
    store.notify("sessionStart")
    await settle()
    store.notify("#pushPrompt:pushDecline")
    expect(stored.get(PUSH_DECLINE_KEY)).toBe("true")
  })
})
