import { isSignupConfirmation, supabase } from "./client.js"

// Who is signed in, synchronously.
//
// This deliberately is not a store entity. The store commits a handler's batch
// only once every notification queued inside it has run, so a handler that reads
// an entity from inside that same batch gets the value it is replacing — a guard
// firing on the navigation a sign-in raised would read a signed-out visitor and
// bounce them straight back to the sign-in screen.
//
// localStorage is outside all of that: it is written before any event is
// dispatched, and it is readable from anywhere, at any time, with no batching in
// between. That makes it the one place a synchronous decision can be made from.
//
// It is a second key beside Supabase's, not a second copy of it. That key holds
// tokens and Supabase owns its lifecycle; this one holds who the visitor is, for
// the questions the UI has to answer before any network call returns. The two are
// written together, from the same auth events.

const STORAGE_KEY = "vaitu-user"

// Whether onboarding is still owed: from a signup until it is finished or
// skipped. Outside the store for the reason above — signup sets it and
// navigates in one batch, and the route guard reading an entity there would
// still see it unset. sessionStorage, so it ends with the tab and onboarding is
// offered once.

const ONBOARDING_KEY = "vaitu-onboarding"

// With email confirmation the signup tab never gets a session: the link in the
// email opens a new tab, whose sessionStorage never saw the signup. So the link
// itself says onboarding is owed. Set at import, before the route guard first
// runs, since the guard imports this module.
if (isSignupConfirmation) setOnboardingDue(true)

/**
 * The signed-in user, or null.
 * @returns {{user_id: string, email: string} | null}
 */
export function readUser() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Corrupt or unavailable storage reads as signed out, which is the safe
    // direction: the guard sends them to sign in rather than into a page they
    // may not see.
    return null
  }
}

/**
 * The id of the signed-in user, or null.
 * @returns {string | null}
 */
export function readUserId() {
  return readUser()?.user_id ?? null
}

/**
 * Records who is signed in.
 * @param {{id: string, email: string}} user - A Supabase user.
 */
export function writeUser(user) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ user_id: user.id, email: user.email }),
  )
}

/**
 * Forgets the signed-in user. Tokens are Supabase's to clear.
 */
export function clearUser() {
  window.localStorage.removeItem(STORAGE_KEY)
}

/**
 * Ends the session everywhere — our record and Supabase's tokens together. Used
 * on sign-out and whenever the server rejects a token we were still holding.
 */
export async function endSession() {
  clearUser()
  await supabase.auth.signOut()
}

/**
 * Records last_login_at and clears a prior soft-deactivation. Fire-and-forget:
 * a failed RPC must not block a session auth already accepted.
 */
export function stampLogin() {
  void Promise.resolve(supabase.rpc("touch_login")).catch(() => {})
}

/** @returns {boolean} */
export function isOnboardingDue() {
  try {
    return window.sessionStorage.getItem(ONBOARDING_KEY) === "due"
  } catch {
    return false
  }
}

/** @param {boolean} isDue */
export function setOnboardingDue(isDue) {
  try {
    if (isDue) window.sessionStorage.setItem(ONBOARDING_KEY, "due")
    else window.sessionStorage.removeItem(ONBOARDING_KEY)
  } catch {
    // Storage unavailable: onboarding is skipped, which only costs the offer.
  }
}
