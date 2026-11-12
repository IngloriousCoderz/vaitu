import { withStorage } from "@inglorious/store/storage"

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
 */
export const Session = [
  {
    create(entity, _, api) {
      entity.user ??= null
      entity.isOnboardingDue ??= false
      api.notify("sessionChange", {
        user: entity.user,
        isOnboardingDue: entity.isOnboardingDue,
      })
    },

    sessionChange(entity, change) {
      Object.assign(entity, change)
    },
  },
  withStorage(["user"], { key: USER_STORAGE_KEY }),
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
