import { describe, expect, it, vi } from "vitest"

import { UPDATE_DEFER_KEY } from "../../constants/index.js"
import { PwaUpdate } from "./index.js"
import { UpdateBar, UpdateDialog } from "./template.js"

describe("PwaUpdate", () => {
  it("starts quiet: no bar before any claim, and nothing on a first-ever one", () => {
    const entity = {}
    PwaUpdate.create(entity)
    expect(entity.isUpdateReady).toBe(false)
    expect(entity.isDismissed).toBe(false)
  })

  it("a worker claiming a page that already ran one readies the update", () => {
    const entity = {}
    PwaUpdate.create(entity)
    PwaUpdate.ready(entity)
    expect(entity.isUpdateReady).toBe(true)
    expect(entity.isDismissed).toBe(false)
  })

  it("the X does not refuse anything: it asks when to apply", () => {
    const entity = {}
    PwaUpdate.create(entity)
    PwaUpdate.ready(entity)
    PwaUpdate.ask(entity)
    expect(entity.isDialogOpen).toBe(true)

    // Closing without choosing keeps the pill as it was.
    PwaUpdate.decline(entity)
    expect(entity.isDialogOpen).toBe(false)
    expect(entity.isDismissed).toBe(false)

    // A later claim quiets any dialog left open.
    PwaUpdate.ask(entity)
    PwaUpdate.ready(entity)
    expect(entity.isDialogOpen).toBe(false)
    expect(entity.isDismissed).toBe(false)
  })

  it("choosing next time hides the pill and arms one boot reload", () => {
    const entity = {}
    PwaUpdate.create(entity)
    PwaUpdate.ready(entity)
    PwaUpdate.ask(entity)
    const setItem = vi.fn()
    const originalWindow = globalThis.window
    globalThis.window = {
      localStorage: {
        getItem: vi.fn(() => null),
        removeItem: vi.fn(),
        setItem,
      },
    }
    try {
      PwaUpdate.defer(entity)
    } finally {
      globalThis.window = originalWindow
    }
    expect(entity.isDismissed).toBe(true)
    expect(entity.isDialogOpen).toBe(false)
    expect(setItem).toHaveBeenCalledWith(UPDATE_DEFER_KEY, "1")
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
      globalThis.window = originalWindow
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
      })
    } catch (error) {
      globalThis.window = originalWindow
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
      })
      throw error
    }
    expect(reload).toHaveBeenCalledOnce()
  })

  it("refresh with nothing waiting reloads straight away", async () => {
    const reload = vi.fn()
    const originalWindow = globalThis.window
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
        value: navigator,
        configurable: true,
      })
    }
    expect(reload).toHaveBeenCalledOnce()
  })

  it("a dismissed bar renders nothing", () => {
    expect(UpdateBar.render({ isDismissed: true })).toBe("")
  })

  it("the dialog stays closed while nothing is asked", () => {
    expect(UpdateDialog.render({ isOpen: false })).toBe(null)
  })
})
