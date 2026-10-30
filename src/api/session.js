import { isSignupConfirmation, supabase } from "./client.js"
import { push } from "./push.js"

// Not a store entity on purpose: a handler reading an entity inside its own
// batch sees the old value, so a guard firing on a sign-in's navigation would
// bounce the user back. localStorage is written before any event, so
// synchronous decisions read it.

const STORAGE_KEY = "vaitu-user"

// Outside the store for the same reason: signup sets it and navigates in one
// batch.

const ONBOARDING_KEY = "vaitu-onboarding"

// The confirmation link opens a new tab whose sessionStorage never saw the
// signup, so the link itself says onboarding is owed. Set at import, before the
// guard first runs.
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
 * This device's pushes go first, while the token can still delete them; with
 * a token already rejected they stay until the next sign-in here takes the
 * device over.
 */
export async function endSession() {
  await push.unregister().catch(() => {})
  clearUser()
  await supabase.auth.signOut()
}

/**
 * Records last_login_at and clears a prior soft-deactivation. Never rejects:
 * a failed RPC must not block a session auth already accepted, so it reads as
 * "nothing was reactivated".
 * @returns {Promise<boolean>} Whether this sign-in reactivated the account.
 */
export function stampLogin() {
  return Promise.resolve(supabase.rpc("touch_login"))
    .then(({ data }) => data === true)
    .catch(() => false)
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
