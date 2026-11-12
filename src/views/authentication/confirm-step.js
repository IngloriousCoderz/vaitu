import { Button } from "@inglorious/ui/button"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { FormActions } from "../../common/form-actions/index.js"
import { t, trans } from "../../i18n/index.js"
import styles from "./style.module.css"
import { SubmitButton } from "./submit-button"

export const ConfirmStep = {
  render({
    entity,
    isBusy,
    error,
    onField,
    onVerifyCode,
    onResend,
    onBackToEmail,
  }) {
    return html`
      <div class=${styles.step} key="confirm">
        <form
          class=${styles.form}
          action=""
          novalidate
          @submit=${(e) => {
            e.preventDefault()
            onVerifyCode()
          }}
        >
          <h2 class=${styles.title}>${t("auth.checkInbox")}</h2>
          <p class=${styles.subtitle}>
            ${trans(
              entity.codeFor === "signIn"
                ? "auth.signInCodeSent"
                : "auth.confirmationSent",
              {
                values: { email: getFieldValue(entity, "email", "") },
                components: {
                  strong: (children) => html`<strong>${children}</strong>`,
                },
              },
            )}
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
              id: "confirm-code",
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
              SubmitButton.render({ isBusy, label: t("auth.confirm") }),
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

export const LinkStep = {
  render({ isBusy, error, onVerifyLink, onBackToEmail }) {
    return html`
      <div class=${styles.step} key="link">
        <form
          class=${styles.form}
          action=""
          novalidate
          @submit=${(e) => {
            e.preventDefault()
            onVerifyLink()
          }}
        >
          <h2 class=${styles.title}>${t("auth.confirmTitle")}</h2>
          <p class=${styles.subtitle}>${t("auth.confirmLink")}</p>
          ${ErrorAlert.render({ error, className: styles.error })}
          ${FormActions.render({
            children: [
              SubmitButton.render({ isBusy, label: t("auth.confirm") }),
              when(error, () =>
                Button.render({
                  children: t("auth.backToLogin"),
                  variant: "ghost",
                  color: "primary",
                  shape: "pill",
                  size: "md",
                  isFullWidth: true,
                  onClick: onBackToEmail,
                }),
              ),
            ],
          })}
        </form>
      </div>
    `
  },
}
