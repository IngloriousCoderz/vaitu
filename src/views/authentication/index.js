import { Form } from "@inglorious/web/form"

import { clearAuthErrors } from "./handlers.js"
import * as handlers from "./handlers.js"
import { Authentication as renderers } from "./template.js"

const { emailCheck, login, signup, ...syncHandlers } = handlers

export const Authentication = {
  ...Form,
  ...syncHandlers,
  ...emailCheck,
  ...login,
  ...signup,
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
    entity.status ??= "idle"
    entity.error ??= null
  },

  // The route is what opens this page, exactly as it does for every other one.
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

// After the visibility toggle re-renders (type password<->text resets the
// cursor to 0), put focus back at the end of that same field so typing can
// continue. "Cursor" = the blinking text-insertion point.
function restoreCursor(inputId) {
  requestAnimationFrame(() => {
    const el = document.getElementById(inputId)
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  })
}

// Entering the sign-in route starts the form over, every time. Without this the
// step survives from whoever was here last: sign in, sign out, come back, and you
// land on the password screen with the previous address still filled in.
function open(entity) {
  entity.step = "email"
  entity.mode = "login"
  entity.status = "idle"
  entity.error = null
  entity.password = ""
  entity.confirmPassword = ""
  clearAuthErrors(entity)
  Form.reset(entity)
}
