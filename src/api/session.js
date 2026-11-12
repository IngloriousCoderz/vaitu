import { supabase } from "./client.js"
import { push } from "./push.js"

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
