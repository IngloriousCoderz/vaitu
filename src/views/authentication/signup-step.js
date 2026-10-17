import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { PasswordField } from "./password-field.js"
import styles from "./style.module.css"
import { SubmitButton } from "./submit-button"
import { UsernameHint } from "./username-hint.js"

export const SignupStep = {
  render({
    entity,
    isBusy,
    onField,
    onContinue,
    onBackToEmail,
    onTogglePassword,
    onToggleConfirmPassword,
  }) {
    return html`
      <div class=${styles.step} key="signup">
        <form
          class=${styles.form}
          action=""
          novalidate
          @submit=${(e) => {
            e.preventDefault()
            onContinue()
          }}
        >
          <h2 class=${styles.title}>Create your account</h2>
          <p class=${styles.subtitle}>
            Signing up as
            <strong>${getFieldValue(entity, "email", "")}</strong>.
            ${Button.render({
              children: "Change email",
              variant: "ghost",
              size: "sm",
              className: styles.linkButton,
              onClick: onBackToEmail,
            })}
          </p>
          ${UsernameHint.render({
            id: "signup-username",
            email: getFieldValue(entity, "email", ""),
          })}
          <div class=${styles.field}>
            ${Input.render({
              id: "signup-name",
              label: "Full name",
              inputType: "text",
              name: "name",
              value: getFieldValue(entity, "full_name", ""),
              placeholder: "Your name",
              isFullWidth: true,
              isRequired: true,
              error: getFieldError(entity, "full_name"),
              onChange: (value) => onField({ field: "full_name", value }),
              autocomplete: "name",
            })}
          </div>
          <div class=${styles.field}>
            ${PasswordField.render({
              id: "signup_password",
              label: "Password",
              name: "new-password",
              field: "password",
              autocomplete: "new-password",
              entity,
              isVisible: entity.isPasswordVisible,
              onField,
              onToggle: onTogglePassword,
            })}
          </div>
          <div class=${styles.field}>
            ${PasswordField.render({
              id: "signup_confirm",
              label: "Confirm password",
              name: "confirm-password",
              field: "confirmPassword",
              autocomplete: "new-password",
              entity,
              isVisible: entity.isConfirmPasswordVisible,
              onField,
              onToggle: onToggleConfirmPassword,
            })}
          </div>
          ${ErrorAlert.render({ error: entity.error, className: styles.error })}
          ${Flex.render({
            direction: "column",
            align: "stretch",
            className: styles.bottomBar,
            children: SubmitButton.render({ isBusy, label: "Continue" }),
          })}
        </form>
      </div>
    `
  },
}
