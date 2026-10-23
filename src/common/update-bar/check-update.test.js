import { describe, expect, it, vi } from "vitest"

import { UPDATE_DEFER_KEY } from "../../constants/index.js"
import { createUpdateCheck } from "./check-update.js"

// Harnesses for the registration the browser would hand `onRegisteredSW`:
// a registration that already holds a waiting worker, and one that installs
// a new one on `update()` — with `statechange` driven by hand, since the
// worker object is a plain stand-in for the real one.
const waitingWorker = (state = "installed") => ({ state, listeners: [], addEventListener(type, handler) { this.listeners.push(handler) } })
const registrationWith = (waiting = null) => ({
  waiting,
  installing: null,
  listeners: [],
  addEventListener(type, handler) { this.listeners.push(handler) },
  installingOf: null,
  update: vi.fn(),
})

const harness = ({ hadController = true, stored = null } = {}) => {
  const notifications = []
  const saved = { "vaitu-update-deferral": stored }
  const storage = {
    getItem: (key) => saved[key] ?? null,
    removeItem: (key) => { delete saved[key] },
    setItem: (key, value) => { saved[key] = value },
  }
  const listeners = []
  const fakeDocument = { hidden: true, addEventListener: (type, handler) => listeners.push(handler) }
  return {
    check: createUpdateCheck({
      checkEveryMs: 9_000_000,
      notify: (event) => notifications.push(event),
      storage,
      document: fakeDocument,
      hadController,
    }),
    registration: registrationWith(),
    making: waitingWorker(),
    notifications,
    saved,
    listeners,
    fakeDocument,
  }
}

describe("update check", () => {
  it("checks hourly and on coming back to the foreground, not while hidden", () => {
    vi.useFakeTimers()
    const h = harness()
    h.check.attach(h.registration)
    vi.advanceTimersByTime(18_000_000) // two passes of the nine-minute step
    expect(h.registration.update).toHaveBeenCalledTimes(2)
    h.fakeDocument.hidden = false
    for (const handler of h.listeners) handler()
    expect(h.registration.update).toHaveBeenCalledTimes(3)
    h.fakeDocument.hidden = true
    for (const handler of h.listeners) handler()
    expect(h.registration.update).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })

  it("a first-ever install stays silent: no old version to move from", () => {
    const h = harness({ hadController: false })
    h.check.attach(h.registration)
    h.check.announce(h.making)
    h.check.announce(waitingWorker())
    expect(h.notifications).toEqual([])
  })

  it("a worker claiming a page that already ran one readies the update, once per worker", () => {
    const h = harness()
    h.check.attach(h.registration)
    h.registration.installing = h.making
    h.check.announce(h.making)
    h.check.announce(h.making) // same worker again: still one claim
    expect(h.notifications).toEqual(["#pwaUpdate:updateReady"])
  })

  it("the waiting worker is announced at boot, before any check runs", () => {
    const h = harness()
    const registration = registrationWith(h.making)
    h.check.attach(registration)
    expect(h.notifications).toEqual(["#pwaUpdate:updateReady"])
  })

  it("an activated worker resets the single-notice guard", () => {
    const h = harness()
    h.check.attach(h.registration)
    const first = h.making
    h.check.announce(first)
    first.state = "activated"
    for (const handler of first.listeners) handler()
    const next = waitingWorker()
    h.check.announce(next)
    expect(h.notifications.filter((n) => n === "#pwaUpdate:updateReady")).toHaveLength(2)
  })

  it("spends the deferral exactly once: reload onto the waiting worker, flag gone", () => {
    const h = harness({ stored: "1" })
    h.registration.waiting = h.making
    expect(h.check.spendDeferral(h.registration)).toBe(true)
    expect(h.notifications).toEqual(["#pwaUpdate:updateRefresh"])
    expect(h.saved[UPDATE_DEFER_KEY]).toBeUndefined()

    // Boot again with the flag gone: the deferral is spent, not carried.
    expect(h.check.spendDeferral(h.registration)).toBe(false)
    expect(h.notifications).toEqual(["#pwaUpdate:updateRefresh"])
  })

  it("a deferral that outlived its worker is spent silently, without a reload", () => {
    const h = harness({ stored: "1" })
    // No waiting worker: spent with no reload notification, never carried.
    expect(h.check.spendDeferral(h.registration)).toBe(true)
    expect(h.notifications).toEqual([])
    expect(h.saved[UPDATE_DEFER_KEY]).toBeUndefined()
  })

  it("an armed deferral silences the pill it reloads past, and stops its interval", () => {
    vi.useFakeTimers()
    const h = harness({ stored: "1" })
    h.registration.waiting = h.making
    const lifecycle = h.check.attach(h.registration)
    // The boot reload is on its way: no announcement flash before it lands.
    expect(h.notifications).toEqual(["#pwaUpdate:updateRefresh"])
    lifecycle.stop()
    vi.advanceTimersByTime(90_000_000)
    expect(h.registration.update).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
