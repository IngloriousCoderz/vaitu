import { withStorage } from "@inglorious/store/storage"
import { isNative } from "@inglorious/web/native"

import { preferences } from "../../api/storage.js"
import {
  ONBOARDING_STORAGE_KEY,
  USER_STORAGE_KEY,
} from "../../constants/index.js"

const SESSION = "session"

/**
 * Who is signed in, and whether onboarding is still owed this tab. Every change
 * is a `sessionChange` event, so a handler later in the same update, like the
 * route guard, keeps what it was told: `api.getEntity` would still show the
 * session from before the update.
 *
 * In the native app the user comes back from Preferences a moment after
 * creation: `isRestored` says it has, so the app mounts only then.
 */
export const Session = [
  {
    create(entity, _, api) {
      entity.user ??= null
      entity.isOnboardingDue ??= false
      entity.isRestored ??= !isNative()
      api.notify("sessionChange", {
        user: entity.user,
        isOnboardingDue: entity.isOnboardingDue,
      })
    },

    sessionChange(entity, change) {
      Object.assign(entity, change)
    },

    storageRestore(entity, _, api) {
      entity.isRestored = true
      api.notify("sessionChange", { user: entity.user })
    },
  },
  withStorage(["user"], { key: USER_STORAGE_KEY, storage: () => preferences }),
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
 * Settles once the session is restored: at once in a browser, after
 * Preferences answers in the native app.
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
