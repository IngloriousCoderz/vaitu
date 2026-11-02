import { Router, safePath } from "@inglorious/web/router"

import { isOnboardingDue, readUser } from "../api/session.js"
import { paths } from "../routes"

// Reads localStorage, not the store: a guard firing inside a sign-in's batch
// would still see the visitor signed out. Deny-by-default: a new route needs a
// session unless opted out.

const PRE_LOGIN_ROUTES = new Set(["authentication", "onboarding"])
// The links in the deactivation and notification emails work signed out.
const PUBLIC_ROUTES = new Set(["eraseAccount", "unsubscribe"])

/**
 * Where a signed-out visitor goes, carrying where they were headed.
 * @param {string} path - The path they tried to reach.
 * @returns {{to: string, replace: boolean}} A navigation.
 */
export function signInTarget(path) {
  const from = safePath(path)
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
  return safePath(router.query?.from) ?? paths.events
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
  return (
    pathname === paths.login ||
    pathname === paths.onboarding ||
    pathname === paths.eraseAccount ||
    pathname === paths.unsubscribe
  )
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

  if (PUBLIC_ROUTES.has(payload.route)) return

  if (!user) {
    if (payload.route === "authentication") return
    if (payload.route === "onboarding" && isOnboardingDue()) return
    api.notify("#router:navigate", signInTarget(payload.path))
    return
  }

  if (!isPreLogin(payload.route)) return

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

function isPreLogin(route) {
  return PRE_LOGIN_ROUTES.has(route)
}
