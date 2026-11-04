import { isNetworkError } from "@inglorious/supabase"

/**
 * The message to show for a failed call: "offline" when the server couldn't
 * be reached, "captcha" or "weakPassword" when Supabase Auth refused the
 * Turnstile token or the password, else the error's own, else `fallback`.
 * @param {unknown} error
 * @param {string} fallback A translation key.
 */
export function errorKey(error, fallback) {
  if (isNetworkError(error) || globalThis.navigator?.onLine === false) {
    return "errors.offline"
  }
  if (error?.code === "captcha_failed") return "errors.captcha"
  if (error?.code === "weak_password") return "errors.weakPassword"
  return error?.message ?? fallback
}
