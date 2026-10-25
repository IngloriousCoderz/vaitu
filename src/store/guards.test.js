import { describe, expect, it, vi } from "vitest"

import { paths } from "../routes.js"
import {
  isPreLoginPath,
  isPreLoginRoute,
  landingForSession,
  routeGuard,
  signInTarget,
} from "./guards.js"

describe("signInTarget", () => {
  it("carries a same-origin path and drops a value that would leave the site", () => {
    expect(signInTarget("/events/abc")).toEqual({
      to: `${paths.login}?from=${encodeURIComponent("/events/abc")}`,
      replace: true,
    })
    expect(signInTarget("//example.com")).toEqual({
      to: paths.login,
      replace: true,
    })
    expect(signInTarget("https://example.com")).toEqual({
      to: paths.login,
      replace: true,
    })
    expect(signInTarget(null)).toEqual({ to: paths.login, replace: true })
  })
})

describe("landingForSession", () => {
  it("returns where the visitor was headed, or the event list", () => {
    expect(landingForSession({ query: { from: "/profile" } })).toBe(
      paths.profile,
    )
    expect(landingForSession({ query: { from: "//example.com" } })).toBe(
      paths.events,
    )
    expect(landingForSession({})).toBe(paths.events)
  })
})

describe("pre-login routes", () => {
  it("allows only login and onboarding before a session", () => {
    expect(isPreLoginRoute({ route: "authentication" })).toBe(true)
    expect(isPreLoginRoute({ route: "onboarding" })).toBe(true)
    expect(isPreLoginRoute({ route: "eventList" })).toBe(false)
    expect(isPreLoginPath(paths.login)).toBe(true)
    expect(isPreLoginPath(paths.onboarding)).toBe(true)
    expect(isPreLoginPath(paths.events)).toBe(false)
  })
})

describe("routeGuard, signed out", () => {
  // Storage as the browser would hold it: no user, and onboarding owed or not.
  function guard(route, path, { isOnboardingDue }) {
    const notify = vi.fn()
    const originalWindow = globalThis.window
    globalThis.window = {
      localStorage: { getItem: () => null },
      sessionStorage: { getItem: () => (isOnboardingDue ? "due" : null) },
    }
    try {
      routeGuard({}, { route, path }, { notify })
    } finally {
      globalThis.window = originalWindow
    }
    return notify
  }

  it("lets a visitor wait on onboarding for a session that is on its way", () => {
    const notify = guard("onboarding", paths.onboarding, {
      isOnboardingDue: true,
    })
    expect(notify).not.toHaveBeenCalled()
  })

  it("sends a visitor with no session coming from onboarding to sign in", () => {
    const notify = guard("onboarding", paths.onboarding, {
      isOnboardingDue: false,
    })
    expect(notify).toHaveBeenCalledWith(
      "#router:navigate",
      signInTarget(paths.onboarding),
    )
  })

  it("leaves the sign-in page open", () => {
    const notify = guard("authentication", paths.login, {
      isOnboardingDue: false,
    })
    expect(notify).not.toHaveBeenCalled()
  })
})
