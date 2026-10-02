import * as handlers from "./handlers.js"
import { renderAuth } from "./template.js"

const { emailCheck, login, signup, ...syncHandlers } = handlers

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

export const AuthPage = {
  ...syncHandlers,
  ...emailCheck,
  ...login,
  ...signup,
  render(entity, api) {
    const id = entity.id
    return renderAuth({
      entity,
      callbacks: {
        onField: ({ field, value }) =>
          api.notify(`#${id}:fieldSet`, { field, value }),
        onCheckEmail: () =>
          api.notify(`#${id}:emailCheck`, { email: entity.email }),
        onLogin: () =>
          api.notify(`#${id}:login`, {
            email: entity.email,
            password: entity.password,
          }),
        onContinue: () =>
          api.notify(`#${id}:signup`, {
            full_name: entity.full_name,
            email: entity.email,
            password: entity.password,
            confirmPassword: entity.confirmPassword,
            role: entity.role,
          }),
        onSelectRole: (role) => api.notify(`#${id}:roleSelect`, role),
        onBackToEmail: () => api.notify(`#${id}:emailBack`),
        onBackToRoles: () => api.notify(`#${id}:rolesBack`),
        onTogglePassword: (inputId) => {
          api.notify(`#${id}:passwordToggle`)
          restoreCursor(inputId)
        },
        onToggleConfirmPassword: (inputId) => {
          api.notify(`#${id}:confirmPasswordToggle`)
          restoreCursor(inputId)
        },
      },
    })
  },
}
