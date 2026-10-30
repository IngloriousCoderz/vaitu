import { Form } from "@inglorious/web/form"

import * as handlers from "./handlers.js"
import { clearAuthErrors } from "./handlers.js"
import { Authentication as renderers } from "./template.js"

const { emailCheck, login, signup, resend, ...syncHandlers } = handlers

export const Authentication = {
  ...Form,
  ...syncHandlers,
  ...emailCheck,
  ...login,
  ...signup,
  ...resend,
  ...renderers,

  create(entity) {
    entity.initialValues = {
      email: "",
      password: "",
      confirmPassword: "",
      full_name: "",
    }
    Form.create(entity)
    entity.step ??= "email"
    entity.mode ??= "login"
    entity.isPasswordVisible ??= false
    entity.isConfirmPasswordVisible ??= false
    entity.isResent ??= false
    entity.status ??= "idle"
    entity.error ??= null
  },

  routeChange(entity, payload) {
    if (payload.route !== entity.id) return
    open(entity)
  },

  render(entity, api) {
    const id = entity.id

    return this.renderAuthentication(
      {
        entity,
        callbacks: {
          onField: ({ field, value }) =>
            api.notify(`#${id}:fieldChange`, { path: field, value }),
          onCheckEmail: () => api.notify(`#${id}:emailSubmit`),
          onLogin: () => api.notify(`#${id}:loginSubmit`),
          onContinue: () => api.notify(`#${id}:signupSubmit`),
          onResend: () => api.notify(`#${id}:resendSubmit`),
          onBackToEmail: () => api.notify(`#${id}:emailBack`),
          onTogglePassword: (inputId) => {
            api.notify(`#${id}:passwordToggle`)
            restoreCursor(inputId)
          },
          onToggleConfirmPassword: (inputId) => {
            api.notify(`#${id}:confirmPasswordToggle`)
            restoreCursor(inputId)
          },
        },
      },
      api,
    )
  },
}

function restoreCursor(inputId) {
  requestAnimationFrame(() => {
    const el = document.getElementById(inputId)
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  })
}

function open(entity) {
  entity.step = "email"
  entity.mode = "login"
  entity.status = "idle"
  entity.error = null
  entity.isResent = false
  entity.password = ""
  entity.confirmPassword = ""
  clearAuthErrors(entity)
  Form.reset(entity)
}
