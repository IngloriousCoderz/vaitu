import { isNetworkError } from "@inglorious/supabase"

/**
 * The message to show for a failed call: "offline" when the server couldn't
 * be reached, else the error's own, else `fallback`.
 * @param {unknown} error
 * @param {string} fallback A translation key.
 */
export function errorKey(error, fallback) {
  if (isNetworkError(error) || globalThis.navigator?.onLine === false) {
    return "errors.offline"
  }
  return error?.message ?? fallback
}
