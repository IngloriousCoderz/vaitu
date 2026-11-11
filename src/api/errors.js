import { isCaptchaError, isNetworkError } from "@inglorious/supabase"

/**
 * The message to show for a failed call: "offline" when the server couldn't
 * be reached, "captcha" when the Turnstile widget failed or Supabase
 * Auth refused its token, "weakPassword" when Auth refused the password, "codeExpired" when
 * it refused a confirmation code or link, else the error's own, else `fallback`.
 * @param {unknown} error
 * @param {string} fallback A translation key.
 */
export function errorKey(error, fallback) {
  if (isNetworkError(error) || globalThis.navigator?.onLine === false) {
    return "errors.offline"
  }
  if (isCaptchaError(error)) return "errors.captcha"
  if (error?.code === "weak_password") return "errors.weakPassword"
  if (error?.code === "otp_expired") return "errors.codeExpired"
  return error?.message ?? fallback
}
