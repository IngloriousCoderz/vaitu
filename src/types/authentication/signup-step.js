import { Alert } from "@inglorious/ui/alert"
import { Icon } from "@inglorious/ui/icon"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorLabel } from "../error-label/index.js"
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
            <button
              class=${styles.linkButton}
              type="button"
              @click=${onBackToEmail}
            >
              Change email
            </button>
          </p>
          <input
            class=${styles.srOnly}
            type="email"
            name="username"
            autocomplete="username"
            tabindex="-1"
            aria-hidden="true"
            .value=${getFieldValue(entity, "email", "")}
          />
          <label class=${styles.field}>
            <span>Full name</span>
            <input
              type="text"
              name="name"
              autocomplete="name"
              placeholder="Your name"
              .value=${getFieldValue(entity, "full_name", "")}
              @input=${(e) =>
                onField({ field: "full_name", value: e.target.value })}
            />
            ${ErrorLabel.render({ error: getFieldError(entity, "full_name") })}
          </label>
          <label class=${styles.field}>
            <span>Password</span>
            <div class=${styles.passwordWrap}>
              <input
                id="signup_password"
                data-pw
                name="new-password"
                autocomplete="new-password"
                type=${entity.isPasswordVisible ? "text" : "password"}
                placeholder="••••••••"
                .value=${getFieldValue(entity, "password", "")}
                @input=${(e) =>
                  onField({ field: "password", value: e.target.value })}
              />
              <button
                class=${styles.eyeButton}
                type="button"
                aria-label=${entity.isPasswordVisible ? "Hide password" : "Show password"}
                @mousedown=${(e) => e.preventDefault()}
                @click=${() => onTogglePassword("signup_password")}
              >
                ${Icon.render({
                  name: entity.isPasswordVisible ? "eye-off" : "eye",
                  size: 18,
                })}
              </button>
            </div>
            ${ErrorLabel.render({ error: getFieldError(entity, "password") })}
          </label>
          <label class=${styles.field}>
            <span>Confirm password</span>
            <div class=${styles.passwordWrap}>
              <input
                id="signup_confirm"
                data-pw
                name="confirm-password"
                autocomplete="new-password"
                type=${entity.isConfirmPasswordVisible ? "text" : "password"}
                placeholder="••••••••"
                .value=${getFieldValue(entity, "confirmPassword", "")}
                @input=${(e) =>
                  onField({ field: "confirmPassword", value: e.target.value })}
              />
              <button
                class=${styles.eyeButton}
                type="button"
                aria-label=${entity.isConfirmPasswordVisible ? "Hide password" : "Show password"}
                @mousedown=${(e) => e.preventDefault()}
                @click=${() => onToggleConfirmPassword("signup_confirm")}
              >
                ${Icon.render({
                  name: entity.isConfirmPasswordVisible ? "eye-off" : "eye",
                  size: 18,
                })}
              </button>
            </div>
            ${ErrorLabel.render({
              error: getFieldError(entity, "confirmPassword"),
            })}
          </label>
          ${
            entity.error
              ? Alert.render({
                  severity: "error",
                  className: `vaitu-alert ${styles.error}`,
                  children: entity.error,
                })
              : ""
          }
          <div class=${styles.bottomBar}>
            ${SubmitButton.render({ isBusy, label: "Continue" })}
          </div>
        </form>
      </div>
    `
  },
}
