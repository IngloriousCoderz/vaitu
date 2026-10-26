import { describe, expect, it, vi } from "vitest"

import { createUpdateCheck } from "./check-update.js"

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

  it("a worker landing mid-session readies the pill, once per worker", () => {
    const h = harness()
    h.check.attach(h.registration)
    h.registration.installing = h.making
    h.check.announce(h.making)
    h.check.announce(h.making) // same worker again: still one claim
    expect(h.notifications).toEqual(["#pwaUpdate:ready"])
  })

  it("a worker waiting at boot is applied straight away, without the pill", () => {
    const h = harness()
    h.check.attach(registrationWith(h.making))
    expect(h.notifications).toEqual(["#pwaUpdate:refresh"])
  })

  it("a waiting worker is applied on the way to the background", () => {
    const h = harness()
    h.check.attach(h.registration)
    h.registration.waiting = h.making
    h.check.announce(h.making)
    h.fakeDocument.hidden = true
    for (const handler of h.listeners) handler()
    expect(h.notifications).toEqual(["#pwaUpdate:ready", "#pwaUpdate:refresh"])
  })

  it("coming back applies a waiting worker instead of checking again, once", () => {
    const h = harness()
    h.check.attach(h.registration)
    h.registration.waiting = h.making
    h.fakeDocument.hidden = false
    for (const handler of h.listeners) handler()
    for (const handler of h.listeners) handler()
    expect(h.notifications).toEqual(["#pwaUpdate:refresh"])
    expect(h.registration.update).not.toHaveBeenCalled()
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
    expect(
      h.notifications.filter((n) => n === "#pwaUpdate:ready"),
    ).toHaveLength(2)
  })
})

// Harnesses for the registration the browser would hand `onRegisteredSW`:
// a registration that already holds a waiting worker, and one that installs
// a new one on `update()` — with `statechange` driven by hand, since the
// worker object is a plain stand-in for the real one.
function waitingWorker(state = "installed") {
  return {
    state,
    listeners: [],
    addEventListener(type, handler) {
      this.listeners.push(handler)
    },
  }
}
function registrationWith(waiting = null) {
  return {
    waiting,
    installing: null,
    listeners: [],
    addEventListener(type, handler) {
      this.listeners.push(handler)
    },
    update: vi.fn(),
  }
}

function harness({ hadController = true } = {}) {
  const notifications = []
  const listeners = []
  const fakeDocument = {
    hidden: true,
    addEventListener: (type, handler) => listeners.push(handler),
  }
  return {
    check: createUpdateCheck({
      checkEveryMs: 9_000_000,
      notify: (event) => notifications.push(event),
      document: fakeDocument,
      hadController,
    }),
    registration: registrationWith(),
    making: waitingWorker(),
    notifications,
    listeners,
    fakeDocument,
  }
}
