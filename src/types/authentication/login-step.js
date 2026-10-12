import { Icon } from "@inglorious/ui/icon"
import { html } from "@inglorious/web"
import { getFieldValue } from "@inglorious/web/form"

import { ErrorLabel } from "./error-label"
import styles from "./style.module.css"
import { SubmitButton } from "./submit-button"

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
            <button
              class=${styles.linkButton}
              type="button"
              @click=${onBackToEmail}
            >
              Change
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
            <span>Password</span>
            <div class=${styles.passwordWrap}>
              <input
                id="login_password"
                data-pw
                name="password"
                autocomplete="current-password"
                type=${entity.isPasswordVisible ? "text" : "password"}
                placeholder="••••••••"
                .value=${getFieldValue(entity, "password", "")}
                @input=${(e) =>
                  onField({ field: "password", value: e.target.value })}
              />
              <button
                class=${styles.eyeButton}
                type="button"
                aria-label=${
                  entity.isPasswordVisible ? "Hide password" : "Show password"
                }
                @mousedown=${(e) => e.preventDefault()}
                @click=${() => onTogglePassword("login_password")}
              >
                ${Icon.render({
                  name: entity.isPasswordVisible ? "eye-off" : "eye",
                  size: 18,
                })}
              </button>
            </div>
          </label>
          ${ErrorLabel.render({ error: entity.error })}
          <div class=${styles.bottomBar}>
            ${SubmitButton.render({ isBusy, label: "Log in" })}
          </div>
        </form>
      </div>
    `
  },
}
