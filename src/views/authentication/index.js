import { createAuth } from "@inglorious/web/auth"
import { Form } from "@inglorious/web/form"

import { authAdapter } from "../../api/auth.js"
import { sessionUser } from "../../common/session/index.js"
import { MIN_PASSWORD_LENGTH } from "../../constants/index.js"
import {
  isPreLoginPath,
  landingForSession,
  signInTarget,
} from "../../store/guards.js"
import * as handlers from "./handlers.js"
import { clearAuthErrors } from "./handlers.js"
import { template } from "./template.js"

const ROUTER = "router"

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

  create(entity, payload, api) {
    auth.create(entity, payload, api)
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
    entity.announcedId ??= null
  },

  routeChange(entity, payload) {
    if (payload.route !== entity.id) return
    open(entity, payload.query?.token_hash)
  },

  // The one place the app learns who is signed in: Supabase's session as
  // supabaseAuth reports it, with a restored one checked with the server and
  // a failed read retried, never taken for a sign-out. Each new user, or
  // none, is announced once: the session applies it, and the rest hear
  // `sessionStart` or `sessionEnd`.
  sessionChange(entity, user, api) {
    const wasReady = entity.isReady
    auth.sessionChange(entity, user)
    const id = user?.id ?? null
    if (wasReady && id === entity.announcedId) return
    entity.announcedId = id
    api.notify("sessionUpdate", { user: user ? sessionUser(user) : null })
    api.notify(user ? "sessionStart" : "sessionEnd")
    // At launch the guard decides on mount. Later, a session that ends leaves
    // the page for sign-in, and one that starts by itself, as when a refresh
    // succeeds back online, leaves the sign-in page: one started from it has
    // already moved on.
    if (!wasReady) return
    const router = api.getEntity(ROUTER)
    const { pathname, search } = window.location
    if (!user && !isPreLoginPath(pathname)) {
      api.notify("#router:navigate", signInTarget(pathname + search))
    }
    if (user && router?.route === entity.id) {
      api.notify("#router:navigate", {
        to: landingForSession(router),
        replace: true,
      })
    }
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
