import { Form } from "@inglorious/web/form"

import { setOnboardingDue, writeUser } from "../../api/session.js"
import { MIN_PASSWORD_LENGTH } from "../../constants/index.js"
import { currentLocale } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { landingForSession } from "../../store/guards.js"

const ROUTER = "router"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE = /^\d{6,10}$/

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
  entity.tokenHash = null
  entity.error = null
  entity.isCodeResent = false
  clearAuthErrors(entity)
}

// Each form checks its own fields, then hands what was typed to the sign-in
// steps of createAuth.

export function emailFormSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateEmail })
  if (!entity.isValid) return
  api.notify(`#${entity.id}:emailSubmit`, entity.values.email)
}

export function loginFormSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateLogin })
  if (!entity.isValid) return
  api.notify(`#${entity.id}:signInSubmit`, entity.values.password)
}

export function signupFormSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateSignup })
  if (!entity.isValid) return
  api.notify(`#${entity.id}:signUpSubmit`, {
    password: entity.values.password,
    data: {
      full_name: entity.values.full_name.trim(),
      locale: currentLocale(),
    },
  })
}

export function codeFormSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateCode })
  if (!entity.isValid) return
  api.notify(`#${entity.id}:codeSubmit`, entity.values.code)
}

export function resetFormSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateReset })
  if (!entity.isValid) return
  api.notify(`#${entity.id}:resetSubmit`, {
    code: entity.values.code,
    password: entity.values.password,
  })
}

// Onboarding first for a new account, or one that still owes it; otherwise
// where the visitor was heading.
export function signedIn(entity, { user, isNew }, api) {
  const isOnboardingDue = isNew || !user.isOnboarded
  writeUser(user)
  setOnboardingDue(isOnboardingDue)
  Form.reset(entity)
  if (!isNew) {
    api.notify("#jobList:load")
    api.notify("#profile:load")
  }
  api.notify("#router:navigate", {
    to: isOnboardingDue
      ? paths.onboarding
      : landingForSession(api.getEntity(ROUTER)),
    replace: true,
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
  return { ...errors, ...validateNewPassword(values) }
}

/** @returns {any} Its errors include translation keys with values. */
function validateReset(values) {
  return { ...validateCode(values), ...validateNewPassword(values) }
}

function validateNewPassword(values) {
  const errors = {}
  if ((values.password ?? "").length < MIN_PASSWORD_LENGTH) {
    errors.password = {
      key: "validation.passwordLength",
      values: { count: MIN_PASSWORD_LENGTH },
    }
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "validation.passwordsMismatch"
  }
  return errors
}
