import { withStorage } from "@inglorious/store/storage"

import { ONBOARDING_STORAGE_KEY } from "../../constants/index.js"

const SESSION = "session"

/**
 * Who is signed in, and whether onboarding is still owed this tab. Every change
 * is a `sessionUpdate` event, which the session applies and anyone else may
 * hear. The user comes from the authentication entity, which follows
 * Supabase's session: `isRestored` says it has answered once, so the app
 * mounts only then, with the guard deciding on the real session.
 */
export const Session = [
  {
    create(entity) {
      entity.user ??= null
      entity.isOnboardingDue ??= false
      entity.isRestored ??= false
    },

    sessionUpdate(entity, change) {
      Object.assign(entity, change)
      if ("user" in change) entity.isRestored = true
    },
  },
  withStorage(["isOnboardingDue"], {
    key: ONBOARDING_STORAGE_KEY,
    storage: () => globalThis.sessionStorage,
  }),
]

/**
 * What the session keeps of a Supabase user.
 * @param {{ id: string, email: string }} user
 * @returns {{ id: string, email: string }}
 */
export function sessionUser(user) {
  return { id: user.id, email: user.email }
}

/**
 * The signed-in user's id, or null.
 * @param {{ getEntity: (id: string) => any }} api
 * @returns {string | null}
 */
export function signedInId(api) {
  return api.getEntity(SESSION)?.user?.id ?? null
}

/**
 * Settles once Supabase has said whether anyone is signed in: from storage,
 * so offline too.
 * @param {{ getState: () => any, subscribe: (listener: () => void) => () => void }} store
 * @returns {Promise<void>}
 */
export function sessionRestored(store) {
  const isRestored = () => Boolean(store.getState()[SESSION]?.isRestored)
  return new Promise((resolve) => {
    if (isRestored()) return resolve()
    const unsubscribe = store.subscribe(() => {
      if (!isRestored()) return
      unsubscribe()
      resolve()
    })
  })
}
