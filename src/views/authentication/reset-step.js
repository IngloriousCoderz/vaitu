import { Button } from "@inglorious/ui/button"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { FormActions } from "../../common/form-actions/index.js"
import { t, trans } from "../../i18n/index.js"
import { PasswordField } from "./password-field.js"
import styles from "./style.module.css"
import { SubmitButton } from "./submit-button"

export const ResetStep = {
  render({
    entity,
    isBusy,
    error,
    onField,
    onReset,
    onResend,
    onBackToEmail,
    onTogglePassword,
    onToggleConfirmPassword,
  }) {
    return html`
      <div class=${styles.step} key="reset">
        <form
          class=${styles.form}
          action=""
          novalidate
          @submit=${(e) => {
            e.preventDefault()
            onReset()
          }}
        >
          <h2 class=${styles.title}>${t("auth.resetTitle")}</h2>
          <p class=${styles.subtitle}>
            ${trans("auth.resetSent", {
              values: { email: getFieldValue(entity, "email", "") },
              components: {
                strong: (children) => html`<strong>${children}</strong>`,
              },
            })}
            ${Button.render({
              children: t("auth.changeEmail"),
              variant: "ghost",
              color: "primary",
              size: "sm",
              onClick: onBackToEmail,
            })}
          </p>
          <div class=${styles.field}>
            ${Input.render({
              id: "reset-code",
              label: t("auth.code"),
              name: "code",
              value: getFieldValue(entity, "code", ""),
              isFullWidth: true,
              isRequired: true,
              error: t(getFieldError(entity, "code")),
              onChange: (value) => onField({ field: "code", value }),
              inputmode: "numeric",
              autocomplete: "one-time-code",
            })}
          </div>
          <div class=${styles.field}>
            ${PasswordField.render({
              id: "reset_password",
              label: t("auth.newPassword"),
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
              id: "reset_confirm",
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
          ${when(
            entity.isCodeResent,
            () =>
              html`<p class=${styles.subtitle}>
                ${t("auth.confirmationResent")}
              </p>`,
          )}
          ${ErrorAlert.render({ error, className: styles.error })}
          ${FormActions.render({
            children: [
              SubmitButton.render({ isBusy, label: t("auth.resetSubmit") }),
              Button.render({
                children: t("auth.resendConfirmation"),
                variant: "ghost",
                color: "primary",
                shape: "pill",
                size: "md",
                isFullWidth: true,
                isDisabled: isBusy,
                onClick: onResend,
              }),
            ],
          })}
        </form>
      </div>
    `
  },
}
