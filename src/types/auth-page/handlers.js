import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"

export function setField(entity, { field, value }) {
  entity[field] = value
  entity.error = null
}

export function togglePassword(entity) {
  entity.isPasswordVisible = !entity.isPasswordVisible
}

export function toggleConfirmPassword(entity) {
  entity.isConfirmPasswordVisible = !entity.isConfirmPasswordVisible
}

export function open(entity) {
  entity.isOpen = true
  entity.step = "email"
  entity.status = "idle"
  entity.error = null
}

export function close(entity) {
  entity.isOpen = false
  entity.step = "email"
  entity.status = "idle"
  entity.error = null
  entity.password = ""
  entity.confirmPassword = ""
}

export function closeOverlays(entity) {
  close(entity)
}

export function finishOnboarding(entity) {
  entity.justSignedUp = false
}

export function backToEmail(entity) {
  entity.step = "email"
  entity.error = null
}

export function backToSignup(entity) {
  entity.step = "signup"
  entity.error = null
}

export function selectRole(entity, role) {
  entity.role = role
  entity.error = null
  entity.step = "signup"
}

export function backToRoles(entity) {
  entity.step = "role"
  entity.error = null
}

export const checkEmail = handleAsync("checkEmail", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run({ email }) {
    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      throw new Error("Enter a valid email")
    }
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 15000)
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
    entity.email = email
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
  async run({ full_name, email, password, confirmPassword, role }) {
    if (full_name.trim().length === 0) throw new Error("Name is required")
    if (password.length < 6)
      throw new Error("Password must be at least 6 characters")
    if (password !== confirmPassword)
      throw new Error("Passwords do not match")
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
