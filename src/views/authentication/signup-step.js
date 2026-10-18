import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { t, trans } from "../../i18n/index.js"
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
          <h2 class=${styles.title}>${t("auth.createAccount")}</h2>
          <p class=${styles.subtitle}>
            ${trans("auth.signingUpAs", {
              values: { email: getFieldValue(entity, "email", "") },
              components: {
                strong: (children) => html`<strong>${children}</strong>`,
              },
            })}
            ${Button.render({
              children: t("auth.changeEmail"),
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
              label: t("auth.fullName"),
              inputType: "text",
              name: "name",
              value: getFieldValue(entity, "full_name", ""),
              placeholder: t("auth.yourName"),
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
              label: t("auth.password"),
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
              label: t("auth.confirmPassword"),
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
            children: SubmitButton.render({
              isBusy,
              label: t("auth.continue"),
            }),
          })}
        </form>
      </div>
    `
  },
}
