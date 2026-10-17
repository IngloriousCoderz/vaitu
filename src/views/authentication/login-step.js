import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { html } from "@inglorious/web"
import { getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { PasswordField } from "./password-field.js"
import styles from "./style.module.css"
import { SubmitButton } from "./submit-button"
import { UsernameHint } from "./username-hint.js"

export const LoginStep = {
  render({
    entity,
    isBusy,
    onField,
    onLogin,
    onBackToEmail,
    onTogglePassword,
  }) {
    return html`
      <div class=${styles.step} key="login">
        <form
          class=${styles.form}
          action=""
          novalidate
          @submit=${(e) => {
            e.preventDefault()
            onLogin()
          }}
        >
          <h2 class=${styles.title}>Welcome back</h2>
          <p class=${styles.subtitle}>
            Logging in as
            <strong>${getFieldValue(entity, "email", "")}</strong>.
            ${Button.render({
              children: "Change",
              variant: "ghost",
              size: "sm",
              className: styles.linkButton,
              onClick: onBackToEmail,
            })}
          </p>
          ${UsernameHint.render({
            id: "login-username",
            email: getFieldValue(entity, "email", ""),
          })}
          <div class=${styles.field}>
            ${PasswordField.render({
              id: "login_password",
              label: "Password",
              name: "password",
              field: "password",
              autocomplete: "current-password",
              entity,
              isVisible: entity.isPasswordVisible,
              onField,
              onToggle: onTogglePassword,
            })}
          </div>
          ${ErrorAlert.render({ error: entity.error, className: styles.error })}
          ${Flex.render({
            direction: "column",
            align: "stretch",
            className: styles.bottomBar,
            children: SubmitButton.render({ isBusy, label: "Log in" }),
          })}
        </form>
      </div>
    `
  },
}
