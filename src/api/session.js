import { isAuthApiError } from "@supabase/supabase-js"

import { supabase } from "./client.js"
import { push } from "./push.js"

const STATUS_UNAUTHORIZED = 401
const STATUS_FORBIDDEN = 403
const STATUS_NOT_FOUND = 404

/**
 * Whether the Auth server itself turned the token down: the only failure that
 * proves a session dead. Anything else, a fetch that never left the device, a
 * storage read that came back empty while the WebView was reloading, says
 * nothing about the session, and ending it there signs out a valid user.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isSessionRejected(error) {
  return (
    isAuthApiError(error) &&
    [STATUS_UNAUTHORIZED, STATUS_FORBIDDEN, STATUS_NOT_FOUND].includes(
      error.status,
    )
  )
}

/**
 * Ends the session everywhere: Supabase's sign-out announces it, and the app
 * forgets the user from there. Used on sign-out and whenever the server
 * rejects a token we were still holding. This device's pushes go first, while
 * the token can still delete them; with a token already rejected they stay
 * until the next sign-in here takes the device over.
 */
export async function endSession() {
  await push.unregister().catch(() => {})
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
