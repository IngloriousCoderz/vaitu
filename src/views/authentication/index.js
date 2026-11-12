import { createAuth } from "@inglorious/web/auth"
import { Form } from "@inglorious/web/form"

import { authAdapter } from "../../api/auth.js"
import { MIN_PASSWORD_LENGTH } from "../../constants/index.js"
import * as handlers from "./handlers.js"
import { clearAuthErrors } from "./handlers.js"
import { template } from "./template.js"

const auth = createAuth({
  adapter: authAdapter,
  methods: ["password", "code"],
  minPasswordLength: MIN_PASSWORD_LENGTH,
})

export const Authentication = {
  ...auth,
  ...Form,
  ...handlers,
  ...template,

  create(entity) {
    auth.create(entity)
    entity.initialValues = {
      email: "",
      password: "",
      confirmPassword: "",
      full_name: "",
      code: "",
    }
    Form.create(entity)
    entity.isPasswordVisible ??= false
    entity.isConfirmPasswordVisible ??= false
    entity.tokenHash ??= null
  },

  routeChange(entity, payload) {
    if (payload.route !== entity.id) return
    open(entity, payload.query?.token_hash)
  },

  render(entity, api) {
    const id = entity.id

    return this.renderAuthentication(
      {
        entity,
        callbacks: {
          onField: ({ field, value }) =>
            api.notify(`#${id}:fieldChange`, { path: field, value }),
          onCheckEmail: () => api.notify(`#${id}:emailFormSubmit`),
          onLogin: () => api.notify(`#${id}:loginFormSubmit`),
          onForgotPassword: () => api.notify(`#${id}:resetRequest`),
          onCodeRequest: () => api.notify(`#${id}:codeRequest`),
          onContinue: () => api.notify(`#${id}:signupFormSubmit`),
          onResend: () => api.notify(`#${id}:codeResend`),
          onVerifyCode: () => api.notify(`#${id}:codeFormSubmit`),
          onReset: () => api.notify(`#${id}:resetFormSubmit`),
          onVerifyLink: () =>
            api.notify(`#${id}:linkSubmit`, { tokenHash: entity.tokenHash }),
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

// A link from a confirmation email opens on its own step, behind a tap: mail
// scanners follow links too.
function open(entity, tokenHash) {
  entity.step = tokenHash ? "link" : "email"
  entity.tokenHash = tokenHash ?? null
  entity.codeFor = null
  entity.status = "idle"
  entity.error = null
  entity.isCodeResent = false
  clearAuthErrors(entity)
  Form.reset(entity)
}
