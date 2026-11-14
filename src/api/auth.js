import { supabaseAuth } from "@inglorious/supabase"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { captcha, supabase } from "./client.js"

const STATUS_TOO_MANY_REQUESTS = 429

const auth = supabaseAuth(supabase, {
  captcha,
  accountExistsFunction: "check-email",
  codeCreatesAccount: false,
})

/**
 * Supabase Auth as the sign-in screen needs it: the email check gives up
 * after a while and says when it is rate-limited, signing in tells whether
 * the account still owes its onboarding, which decides where the app goes
 * next, and a sign-in code never creates an account, which only sign-up does,
 * with a name and the terms accepted.
 */
export const authAdapter = {
  ...auth,

  accountExists(email) {
    return Promise.race([auth.accountExists(email), timeout()])
  },

  async signIn(email, password) {
    return withOnboarding(await auth.signIn(email, password))
  },

  async verifyCode(email, code, purpose) {
    const user = await auth.verifyCode(email, code, purpose)
    return purpose === "signIn" ? withOnboarding(user) : user
  },

  async updatePassword(password) {
    return withOnboarding(await auth.updatePassword(password))
  },

  errorCode(error) {
    if (error?.context?.status === STATUS_TOO_MANY_REQUESTS) {
      return "rateLimited"
    }
    return auth.errorCode(error)
  },
}

async function withOnboarding(user) {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .single()
  if (error) throw error
  return { ...user, isOnboarded: Boolean(data.onboarded_at) }
}

function timeout() {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timed out")), REQUEST_TIMEOUT_MS)
  })
}
