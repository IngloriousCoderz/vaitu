import { Alert } from "@inglorious/ui/alert"
import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { RevealToggle } from "./reveal-toggle.js"
import styles from "./style.module.css"
import { SubmitButton } from "./submit-button"

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
          <!-- Exists only so a password manager can fill the address it was
               given earlier. Labelless on purpose: there is nothing to tell a
               person about a field they never see. The wrapper clips the whole
               control, so the primitive still renders. -->
          <div class=${styles.srOnly}>
            ${Input.render({
              id: "signup-username",
              inputType: "email",
              name: "username",
              value: getFieldValue(entity, "email", ""),
              isFullWidth: true,
              autocomplete: "username",
              tabindex: -1,
              "aria-hidden": "true",
            })}
          </div>
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
            ${Input.render({
              id: "signup_password",
              label: "Password",
              name: "new-password",
              inputType: entity.isPasswordVisible ? "text" : "password",
              value: getFieldValue(entity, "password", ""),
              placeholder: "••••••••",
              isFullWidth: true,
              isRequired: true,
              error: getFieldError(entity, "password"),
              onChange: (value) => onField({ field: "password", value }),
              autocomplete: "new-password",
              iconAfter: RevealToggle.render({
                isPasswordVisible: entity.isPasswordVisible,
                inputId: "signup_password",
                onTogglePassword,
              }),
              isIconAfterActionable: true,
              "data-pw": "",
            })}
          </div>
          <div class=${styles.field}>
            ${Input.render({
              id: "signup_confirm",
              label: "Confirm password",
              name: "confirm-password",
              inputType: entity.isConfirmPasswordVisible ? "text" : "password",
              value: getFieldValue(entity, "confirmPassword", ""),
              placeholder: "••••••••",
              isFullWidth: true,
              isRequired: true,
              error: getFieldError(entity, "confirmPassword"),
              onChange: (value) => onField({ field: "confirmPassword", value }),
              autocomplete: "new-password",
              iconAfter: RevealToggle.render({
                isPasswordVisible: entity.isConfirmPasswordVisible,
                inputId: "signup_confirm",
                onToggleConfirmPassword,
              }),
              isIconAfterActionable: true,
              "data-pw": "",
            })}
          </div>
          ${
            entity.error
              ? Alert.render({
                  severity: "error",
                  className: `vaitu-alert ${styles.error}`,
                  children: entity.error,
                })
              : ""
          }
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
