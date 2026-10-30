import { handleAsync } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { setOnboardingDue, writeUser } from "../../api/session.js"
import {
  MIN_PASSWORD_LENGTH,
  REQUEST_TIMEOUT_MS,
} from "../../constants/index.js"
import { paths } from "../../routes.js"
import { landingForSession } from "../../store/guards.js"

const ROUTER = "router"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  entity.isValid = true
}

export function onboardingFinish(entity, _, api) {
  setOnboardingDue(false)
  api.notify("#router:navigate", paths.events)
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

export const emailCheck = handleAsync("emailCheck", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
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
    return { mode: data.exists ? "login" : "signup", email: clean }
  },
  success(entity, { mode, email }) {
    entity.status = "ready"
    entity.mode = mode
    entity.values.email = email
    entity.step = mode
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "errors.checkEmail"
  },
})

export const login = handleAsync("login", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
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
    entity.status = "ready"
    entity.password = ""
    writeUser(user)
    setOnboardingDue(!isOnboarded)
    api.notify("#eventList:load")
    api.notify("#profile:load")
    const router = api.getEntity(ROUTER)
    api.notify("#router:navigate", {
      to: isOnboarded ? landingForSession(router) : paths.onboarding,
      replace: true,
    })
  },
  error(entity, err) {
    if (err.code === "email_not_confirmed") {
      entity.status = "ready"
      entity.error = null
      entity.password = ""
      entity.step = "confirm"
      return
    }
    entity.status = "error"
    entity.error = err.message ?? "errors.login"
  },
})

export const signup = handleAsync("signup", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run({ full_name, email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: full_name.trim() },
        emailRedirectTo: confirmationRedirect(),
      },
    })
    if (error) throw error
    return Boolean(data.session)
  },
  success(entity, hasSession, api) {
    entity.status = "ready"
    entity.password = ""
    if (!hasSession) {
      entity.step = "confirm"
      return
    }
    setOnboardingDue(true)
    api.notify("#router:navigate", paths.onboarding)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "errors.signup"
  },
})

export const resend = handleAsync("resend", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
    entity.isResent = false
  },
  async run({ email }) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmationRedirect() },
    })
    if (error) throw error
    return true
  },
  success(entity) {
    entity.status = "ready"
    entity.isResent = true
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "errors.resend"
  },
})

export function resendSubmit(entity, _, api) {
  api.notify(`#${entity.id}:resend`, {
    email: entity.values.email.trim().toLowerCase(),
  })
}

function confirmationRedirect() {
  return `${window.location.origin}${paths.onboarding}`
}

function validateEmail(values) {
  const errors = {}
  if (!EMAIL.test((values.email ?? "").trim())) {
    errors.email = "validation.validEmail"
  }
  return errors
}

function validateLogin(values) {
  const errors = {}
  if (!values.password) errors.password = "validation.passwordRequired"
  return errors
}

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
