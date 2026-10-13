import { handleAsync } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { MIN_PASSWORD_LENGTH, REQUEST_TIMEOUT_MS } from "../../constants.js"
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(values) {
  return {
    email: EMAIL.test(values.email.trim()) ? null : "Enter a valid email",
  }
}

function validateLogin(values) {
  return {
    password: values.password ? null : "Password is required",
  }
}

function validateSignup(values) {
  return {
    full_name: values.full_name.trim() ? null : "Name is required",
    password:
      values.password.length < MIN_PASSWORD_LENGTH
        ? "Password must be at least 6 characters"
        : null,
    confirmPassword:
      values.password === values.confirmPassword
        ? null
        : "Passwords do not match",
  }
}

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

export function open(entity) {
  entity.isOpen = true
  entity.step = "email"
  entity.status = "idle"
  entity.error = null
  clearAuthErrors(entity)
}

export function close(entity) {
  entity.isOpen = false
  entity.step = "email"
  entity.status = "idle"
  entity.error = null
  entity.password = ""
  entity.confirmPassword = ""
  clearAuthErrors(entity)
  if (entity.values) {
    entity.values.password = ""
    entity.values.confirmPassword = ""
  }
}

export function overlaysClose(entity) {
  close(entity)
}

export function onboardingFinish(entity) {
  entity.justSignedUp = false
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

export function roleSelect(entity, role) {
  entity.role = role
  entity.error = null
  entity.step = "signup"
}

export function rolesBack(entity) {
  entity.step = "role"
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
    role: entity.role,
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
    entity.step = mode === "login" ? "login" : "role"
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return true
  },
  success(entity, _, api) {
    entity.status = "ready"
    entity.password = ""
    api.notify(`#${entity.id}:close`)
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
  async run({ full_name, email, password, role }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: full_name.trim() } },
    })
    if (error) throw error
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: full_name.trim(), role })
      .eq("id", data.user.id)
    if (profileError) throw profileError
    return true
  },
  success(entity, _, api) {
    entity.status = "ready"
    entity.password = ""
    entity.justSignedUp = true
    api.notify(`#${entity.id}:close`)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Sign up failed"
  },
})
