import { handleRequest } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import { captcha, supabase } from "../../api/client.js"
import { errorKey } from "../../api/errors.js"
import { setOnboardingDue, writeUser } from "../../api/session.js"
import {
  MIN_PASSWORD_LENGTH,
  REQUEST_TIMEOUT_MS,
} from "../../constants/index.js"
import { currentLocale } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { landingForSession } from "../../store/guards.js"

const ROUTER = "router"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE = /^\d{6,10}$/
const EMAIL_NOT_CONFIRMED = "emailNotConfirmed"

export function fieldChange(entity, payload) {
  Form.fieldChange(entity, payload)
  entity.error = null
}

export function passwordToggle(entity) {
  entity.isPasswordVisible = !entity.isPasswordVisible
}

export function confirmPasswordToggle(entity) {
  entity.isConfirmPasswordVisible = !entity.isConfirmPasswordVisible
}

export function clearAuthErrors(entity) {
  if (!entity.errors) return
  entity.errors.email = null
  entity.errors.password = null
  entity.errors.confirmPassword = null
  entity.errors.full_name = null
  entity.errors.code = null
  entity.isValid = true
}

export function onboardingFinish(entity, _, api) {
  setOnboardingDue(false)
  api.notify("#router:navigate", paths.jobs)
}

export function emailBack(entity) {
  entity.step = "email"
  entity.error = null
  entity.isResent = false
  clearAuthErrors(entity)
}

export function signupBack(entity) {
  entity.step = "signup"
  entity.error = null
  clearAuthErrors(entity)
}

export function emailSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateEmail })
  if (!entity.isValid) return
  entity.error = null
  api.notify(`#${entity.id}:emailCheck`, {
    email: entity.values.email.trim().toLowerCase(),
  })
}

export function loginSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateLogin })
  if (!entity.isValid) return
  entity.error = null
  api.notify(`#${entity.id}:login`, {
    email: entity.values.email.trim().toLowerCase(),
    password: entity.values.password,
  })
}

export function signupSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateSignup })
  if (!entity.isValid) return
  entity.error = null
  api.notify(`#${entity.id}:signup`, {
    full_name: entity.values.full_name,
    email: entity.values.email,
    password: entity.values.password,
    confirmPassword: entity.values.confirmPassword,
  })
}

export function codeSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateCode })
  if (!entity.isValid) return
  entity.error = null
  api.notify(`#${entity.id}:verify`, {
    email: entity.values.email.trim().toLowerCase(),
    token: entity.values.code.trim(),
  })
}

export function linkSubmit(entity, _, api) {
  entity.error = null
  api.notify(`#${entity.id}:verify`, { token_hash: entity.tokenHash })
}

export const emailCheck = handleRequest(
  "emailCheck",
  {
    async run({ email }) {
      const clean = email.trim().toLowerCase()
      const timeout = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Request timed out")),
          REQUEST_TIMEOUT_MS,
        )
      })
      const call = supabase.functions.invoke("check-email", {
        body: { email: clean },
      })
      const { data, error } = await Promise.race([call, timeout])
      if (error) throw error
      const mode = data.exists ? "login" : "signup"
      captcha.prepare(mode)
      return { mode, email: clean }
    },
    success(entity, { mode, email }) {
      entity.mode = mode
      entity.values.email = email
      entity.step = mode
    },
  },
  { toError: (error) => errorKey(error, "errors.checkEmail") },
)

export const login = handleRequest(
  "login",
  {
    async run({ email, password }) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken: await captcha.token("login") },
      })
      if (error) throw error
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", data.user.id)
        .single()
      if (profileError) throw profileError
      return { user: data.user, isOnboarded: Boolean(profile.onboarded_at) }
    },
    success(entity, { user, isOnboarded }, api) {
      entity.password = ""
      writeUser(user)
      setOnboardingDue(!isOnboarded)
      api.notify("#jobList:load")
      api.notify("#profile:load")
      const router = api.getEntity(ROUTER)
      api.notify("#router:navigate", {
        to: isOnboarded ? landingForSession(router) : paths.onboarding,
        replace: true,
      })
    },
    // Not an error to show: the account waits for its confirmation code.
    error(entity, key) {
      if (key !== EMAIL_NOT_CONFIRMED) return
      entity.status = "idle"
      entity.error = null
      entity.password = ""
      entity.step = "confirm"
    },
  },
  {
    toError: (error) =>
      error?.code === "email_not_confirmed"
        ? EMAIL_NOT_CONFIRMED
        : errorKey(error, "errors.login"),
  },
)

export const signup = handleRequest(
  "signup",
  {
    async run({ full_name, email, password }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: full_name.trim(), locale: currentLocale() },
          captchaToken: await captcha.token("signup"),
        },
      })
      if (error) throw error
      return Boolean(data.session)
    },
    success(entity, hasSession, api) {
      entity.password = ""
      if (!hasSession) {
        entity.step = "confirm"
        return
      }
      setOnboardingDue(true)
      api.notify("#router:navigate", paths.onboarding)
    },
  },
  { toError: (error) => errorKey(error, "errors.signup") },
)

export const resend = handleRequest(
  "resend",
  {
    start(entity) {
      entity.isResent = false
    },
    async run({ email }) {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { captchaToken: await captcha.token("resend") },
      })
      if (error) throw error
      return true
    },
    success(entity) {
      entity.isResent = true
    },
  },
  { toError: (error) => errorKey(error, "errors.resend") },
)

export const verify = handleRequest(
  "verify",
  {
    async run({ email, token, token_hash }) {
      const { data, error } = await supabase.auth.verifyOtp(
        token_hash
          ? { token_hash, type: "email" }
          : { email, token, type: "email" },
      )
      if (error) throw error
      return data.user
    },
    success(entity, user, api) {
      entity.tokenHash = null
      writeUser(user)
      setOnboardingDue(true)
      api.notify("#router:navigate", { to: paths.onboarding, replace: true })
    },
  },
  { toError: (error) => errorKey(error, "errors.verify") },
)

export function resendSubmit(entity, _, api) {
  api.notify(`#${entity.id}:resend`, {
    email: entity.values.email.trim().toLowerCase(),
  })
}

function validateEmail(values) {
  const errors = {}
  if (!EMAIL.test((values.email ?? "").trim())) {
    errors.email = "validation.validEmail"
  }
  return errors
}

function validateCode(values) {
  const errors = {}
  if (!CODE.test((values.code ?? "").trim())) {
    errors.code = "validation.codeInvalid"
  }
  return errors
}

function validateLogin(values) {
  const errors = {}
  if (!values.password) errors.password = "validation.passwordRequired"
  return errors
}

/** @returns {any} Its errors include translation keys with values. */
function validateSignup(values) {
  const errors = {}
  if (!(values.full_name ?? "").trim())
    errors.full_name = "validation.nameRequired"
  if ((values.password ?? "").length < MIN_PASSWORD_LENGTH) {
    errors.password = {
      key: "validation.passwordLength",
      values: {
        count: MIN_PASSWORD_LENGTH,
      },
    }
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "validation.passwordsMismatch"
  }
  return errors
}
