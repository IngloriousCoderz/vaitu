import { Router } from "@inglorious/web/router"

import { isOnboardingDue, readUser } from "../api/session.js"
import { paths } from "../routes"

// The access policy, in one place: a route resolved -> may this visitor be here?
//
// Both halves of the decision read localStorage rather than the store. The store
// commits a handler's batch only after every notification queued inside it has
// run, so a guard firing on the navigation that a sign-in raised would read the
// session from before the sign-in and turn the visitor away. localStorage was
// written before any of that started, so there is no window in which the two
// disagree and no need to defer anything.
//
// It is also deny-by-default: a new route is guarded unless someone deliberately
// opts it out, which is the safer way round for an app where every page but two
// needs a session.

const PRE_LOGIN_ROUTES = new Set(["authentication", "onboarding"])

/**
 * Reads a `from` value back out of a URL. Only same-origin paths are honoured —
 * anything starting with a scheme or with `//` would send a freshly signed-in
 * visitor off the site, so it is discarded rather than followed.
 * @param {unknown} value - The raw value.
 * @returns {string | null} A safe path, or null.
 */
function safeFrom(value) {
  if (typeof value !== "string") return null
  if (!value.startsWith("/") || value.startsWith("//")) return null
  return value
}

function isPreLogin(route) {
  return PRE_LOGIN_ROUTES.has(route)
}

/**
 * Where a signed-out visitor goes, carrying where they were headed.
 * @param {string} path - The path they tried to reach.
 * @returns {{to: string, replace: boolean}} A navigation.
 */
export function signInTarget(path) {
  const from = safeFrom(path)
  return {
    to: from ? `${paths.login}?from=${encodeURIComponent(from)}` : paths.login,
    replace: true,
  }
}

/**
 * Where a visitor who has just signed in belongs: back where they were headed, or
 * the event list.
 * @param {{query?: object}} router - The router entity.
 * @returns {string} A path.
 */
export function landingForSession(router) {
  return safeFrom(router.query?.from) ?? paths.events
}

/**
 * Whether the route now resolved is one a signed-out visitor may sit on.
 * @param {{route: string}} router - The router entity.
 * @returns {boolean}
 */
export function isPreLoginRoute(router) {
  return isPreLogin(router.route)
}

/**
 * The same question asked of a path rather than a resolved route, for callers
 * outside the store — the sign-out path in src/main.js, which cannot reach the
 * router entity.
 * @param {string} pathname - A location pathname.
 * @returns {boolean}
 */
export function isPreLoginPath(pathname) {
  return pathname === paths.login || pathname === paths.onboarding
}

/**
 * Turns the visitor away from a route they may not see, or from a pre-login one
 * they have no reason to be on. Navigates rather than returning a verdict, so
 * nothing downstream renders a page that is about to be replaced.
 * @param {object} entity - The router entity.
 * @param {{route: string, path: string}} payload - The resolved route.
 * @param {object} api - The application API.
 */
export function routeGuard(entity, payload, api) {
  const user = readUser()

  if (!user) {
    if (isPreLogin(payload.route)) return
    api.notify("#router:navigate", signInTarget(payload.path))
    return
  }

  if (!isPreLogin(payload.route)) return

  // Onboarding is offered once, straight after a signup.
  if (payload.route === "onboarding") {
    if (!isOnboardingDue()) {
      api.notify("#router:navigate", { to: paths.events, replace: true })
    }
    return
  }

  api.notify("#router:navigate", landingForSession(api.getEntity("router")))
}

export const guards = {
  Router: [Router, { routeChange: routeGuard }],
}
