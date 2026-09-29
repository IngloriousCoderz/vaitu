import * as handlers from "./handlers.js"
import { renderAuth } from "./template.js"

const { checkEmail, login, signup, ...syncHandlers } = handlers

// After the visibility toggle re-renders (type password<->text resets the
// cursor to 0), put focus back at the end of that same field so typing can
// continue. "Cursor" = the blinking text-insertion point.
function restoreCursor(input_id) {
  requestAnimationFrame(() => {
    const el = document.getElementById(input_id)
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
            confirm_password: entity.confirm_password,
            role: entity.role,
          }),
        onSelectRole: (role) => api.notify(`#${id}:selectRole`, role),
        onBackToEmail: () => api.notify(`#${id}:backToEmail`),
        onBackToRoles: () => api.notify(`#${id}:backToRoles`),
        onTogglePassword: (input_id) => {
          api.notify(`#${id}:togglePassword`)
          restoreCursor(input_id)
        },
        onToggleConfirmPassword: (input_id) => {
          api.notify(`#${id}:toggleConfirmPassword`)
          restoreCursor(input_id)
        },
      },
    })
  },
}
