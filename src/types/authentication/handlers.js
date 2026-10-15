import { handleAsync } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { writeUser } from "../../api/session.js"
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

function clearAuthErrors(entity) {
  if (!entity.errors) return
  entity.errors.email = null
  entity.errors.password = null
  entity.errors.confirmPassword = null
  entity.errors.full_name = null
  entity.isValid = true
}

// Entering the sign-in route starts the form over, every time. Without this the
// step survives from whoever was here last: sign in, sign out, come back, and you
// land on the password screen with the previous address still filled in.
export function open(entity) {
  entity.step = "email"
  entity.mode = "login"
  entity.status = "idle"
  entity.error = null
  entity.password = ""
  entity.confirmPassword = ""
  clearAuthErrors(entity)
  Form.reset(entity)
}

export function onboardingFinish(entity, _, api) {
  entity.justSignedUp = false
  api.notify("#router:navigate", paths.events)
}

export function emailBack(entity) {
  entity.step = "email"
  entity.error = null
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
    entity.error = err.message ?? "Could not check email"
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
    return data.user
  },
  success(entity, user, api) {
    entity.status = "ready"
    entity.password = ""
    // Written before the notification, so the guard that the navigation raises
    // reads a signed-in visitor. Ordering is the whole trick here.
    writeUser(user)
    api.notify("#eventList:eventsLoad")
    api.notify("#profile:profileLoad")
    const router = api.getEntity(ROUTER)
    api.notify("#router:navigate", {
      to: landingForSession(router),
      replace: true,
    })
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Login failed"
  },
})

export const signup = handleAsync("signup", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run({ full_name, email, password }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: full_name.trim() } },
    })
    if (error) throw error
    return true
  },
  success(entity, _, api) {
    entity.status = "ready"
    entity.password = ""
    entity.justSignedUp = true
    api.notify("#router:navigate", paths.onboarding)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Sign up failed"
  },
})

function validateEmail(values) {
  const errors = {}
  if (!EMAIL.test((values.email ?? "").trim())) {
    errors.email = "Enter a valid email"
  }
  return errors
}

function validateLogin(values) {
  const errors = {}
  if (!values.password) errors.password = "Password is required"
  return errors
}

function validateSignup(values) {
  const errors = {}
  if (!(values.full_name ?? "").trim()) errors.full_name = "Name is required"
  if ((values.password ?? "").length < MIN_PASSWORD_LENGTH) {
    errors.password = "Password must be at least 6 characters"
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Passwords do not match"
  }
  return errors
}
