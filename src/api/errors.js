import { isCaptchaError, isNetworkError } from "@inglorious/supabase"

const DATABASE_CODE = /^(PGRST\d+|[0-9A-Z]{5})$/

/**
 * The message to show for a failed call: "offline" when the server couldn't
 * be reached, "captcha" when the Turnstile widget failed or Supabase
 * Auth refused its token, "weakPassword" when Auth refused the password, "codeExpired" when
 * it refused a confirmation code or link, `fallback` for a database error,
 * else the error's own, else `fallback`.
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
  if (isDatabaseError(error)) return fallback
  return error?.message ?? fallback
}

// PostgREST's own codes, and Postgres SQLSTATEs such as a constraint (23505)
// or a function's `raise exception` (P0001): messages for developers, in
// English, never translated.
function isDatabaseError(error) {
  return typeof error?.code === "string" && DATABASE_CODE.test(error.code)
}
