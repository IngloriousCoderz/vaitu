import { describe, expect, it, vi } from "vitest"

import { PwaUpdate } from "./index.js"

describe("PwaUpdate", () => {
  it("starts quiet: no pill before a version lands", () => {
    const entity = {}
    PwaUpdate.create(entity)
    expect(entity.isUpdateReady).toBe(false)
  })

  it("a version landing mid-session raises the pill", () => {
    const entity = {}
    PwaUpdate.create(entity)
    PwaUpdate.ready(entity)
    expect(entity.isUpdateReady).toBe(true)
  })

  it("refresh sends SKIP_WAITING and reloads once the worker takes over", async () => {
    const reload = vi.fn()
    const listeners = []
    const worker = {
      state: "installed",
      listeners,
      addEventListener(type, handler) {
        listeners.push(handler)
      },
      postMessage(message) {
        expect(message.type).toBe("SKIP_WAITING")
        this.state = "activated"
        for (const handler of listeners) handler()
      },
    }
    const originalWindow = globalThis.window
    const originalNavigator = navigator
    globalThis.window = { location: { reload } }
    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: { getRegistration: async () => ({ waiting: worker }) },
      },
      configurable: true,
    })
    try {
      await PwaUpdate.refresh()
    } finally {
      globalThis.window = originalWindow
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
      })
    }
    expect(reload).toHaveBeenCalledOnce()
  })

  it("refresh with nothing waiting reloads straight away", async () => {
    const reload = vi.fn()
    const originalWindow = globalThis.window
    const originalNavigator = navigator
    globalThis.window = { location: { reload } }
    Object.defineProperty(globalThis, "navigator", {
      value: { serviceWorker: { getRegistration: async () => ({}) } },
      configurable: true,
    })
    try {
      await PwaUpdate.refresh()
    } finally {
      globalThis.window = originalWindow
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
      })
    }
    expect(reload).toHaveBeenCalledOnce()
  })
})
