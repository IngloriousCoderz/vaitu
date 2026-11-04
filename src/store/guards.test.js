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
    expect(signInTarget("/jobs/abc")).toEqual({
      to: `${paths.login}?from=${encodeURIComponent("/jobs/abc")}`,
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
  it("returns where the visitor was headed, or the job list", () => {
    expect(landingForSession({ query: { from: "/profile" } })).toBe(
      paths.profile,
    )
    expect(landingForSession({ query: { from: "//example.com" } })).toBe(
      paths.jobs,
    )
    expect(landingForSession({})).toBe(paths.jobs)
  })
})

describe("pre-login routes", () => {
  it("allows only login and onboarding before a session", () => {
    expect(isPreLoginRoute({ route: "authentication" })).toBe(true)
    expect(isPreLoginRoute({ route: "onboarding" })).toBe(true)
    expect(isPreLoginRoute({ route: "jobList" })).toBe(false)
    expect(isPreLoginPath(paths.login)).toBe(true)
    expect(isPreLoginPath(paths.onboarding)).toBe(true)
    expect(isPreLoginPath(paths.jobs)).toBe(false)
  })
})

describe("routeGuard, signed out", () => {
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

describe("routeGuard, signed in", () => {
  it("sends a visitor who opens the sign-in page back where they were headed", () => {
    const notify = vi.fn()
    const originalWindow = globalThis.window
    globalThis.window = {
      localStorage: { getItem: () => JSON.stringify({ id: "user-1" }) },
      sessionStorage: { getItem: () => null },
    }
    try {
      routeGuard(
        {},
        {
          route: "authentication",
          path: paths.login,
          query: { from: "/profile" },
        },
        { notify, getEntity: () => ({ route: "jobList", query: {} }) },
      )
    } finally {
      globalThis.window = originalWindow
    }
    expect(notify).toHaveBeenCalledWith("#router:navigate", "/profile")
  })
})

describe("the public page", () => {
  it("leaves a signed-out visitor on the account erasure link", () => {
    const api = { notify: vi.fn(), getEntity: vi.fn() }
    routeGuard({}, { route: "eraseAccount", path: "/erase-account" }, api)
    expect(api.notify).not.toHaveBeenCalled()
    expect(isPreLoginPath(paths.eraseAccount)).toBe(true)
  })

  it("leaves a signed-out visitor on the unsubscribe link", () => {
    const api = { notify: vi.fn(), getEntity: vi.fn() }
    routeGuard({}, { route: "unsubscribe", path: "/unsubscribe" }, api)
    expect(api.notify).not.toHaveBeenCalled()
    expect(isPreLoginPath(paths.unsubscribe)).toBe(true)
  })
})
