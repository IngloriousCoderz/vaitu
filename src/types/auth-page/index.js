import * as handlers from "./handlers.js"
import { renderAuth } from "./template.js"

const { checkEmail, login, signup, ...syncHandlers } = handlers

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
  ...checkEmail,
  ...login,
  ...signup,
  render(entity, api) {
    const id = entity.id
    return renderAuth({
      entity,
      callbacks: {
        onField: ({ field, value }) =>
          api.notify(`#${id}:setField`, { field, value }),
        onCheckEmail: () =>
          api.notify(`#${id}:checkEmail`, { email: entity.email }),
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
        onSelectRole: (role) => api.notify(`#${id}:selectRole`, role),
        onBackToEmail: () => api.notify(`#${id}:backToEmail`),
        onBackToRoles: () => api.notify(`#${id}:backToRoles`),
        onTogglePassword: (inputId) => {
          api.notify(`#${id}:togglePassword`)
          restoreCursor(inputId)
        },
        onToggleConfirmPassword: (inputId) => {
          api.notify(`#${id}:toggleConfirmPassword`)
          restoreCursor(inputId)
        },
      },
    })
  },
}
