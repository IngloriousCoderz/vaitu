import { Alert } from "@inglorious/ui/alert"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorLabel } from "../../common/error-label/index.js"
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
          ${Flex.render({
            element: "label",
            direction: "column",
            className: styles.field,
            children: html`
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
              ${ErrorLabel.render({
                error: getFieldError(entity, "full_name"),
              })}
            `,
          })}
          ${Flex.render({
            element: "label",
            direction: "column",
            className: styles.field,
            children: html`
              <span>Password</span>
              ${Flex.render({
                className: styles.passwordWrap,
                children: html`
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
                `,
              })}
              ${ErrorLabel.render({
                error: getFieldError(entity, "password"),
              })}
            `,
          })}
          ${Flex.render({
            element: "label",
            direction: "column",
            className: styles.field,
            children: html`
              <span>Confirm password</span>
              ${Flex.render({
                className: styles.passwordWrap,
                children: html`
                  <input
                    id="signup_confirm"
                    data-pw
                    name="confirm-password"
                    autocomplete="new-password"
                    type=${entity.isConfirmPasswordVisible ? "text" : "password"}
                    placeholder="••••••••"
                    .value=${getFieldValue(entity, "confirmPassword", "")}
                    @input=${(e) =>
                      onField({
                        field: "confirmPassword",
                        value: e.target.value,
                      })}
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
                `,
              })}
              ${ErrorLabel.render({
                error: getFieldError(entity, "confirmPassword"),
              })}
            `,
          })}
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
