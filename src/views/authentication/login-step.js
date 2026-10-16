import { Alert } from "@inglorious/ui/alert"
import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { RevealToggle } from "./reveal-toggle"
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
            ${Button.render({
              children: "Change",
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
              id: "login-username",
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
              id: "login_password",
              label: "Password",
              name: "password",
              inputType: entity.isPasswordVisible ? "text" : "password",
              value: getFieldValue(entity, "password", ""),
              placeholder: "••••••••",
              isFullWidth: true,
              isRequired: true,
              error: getFieldError(entity, "password"),
              onChange: (value) => onField({ field: "password", value }),
              // The reveal button lives in the field's own trailing slot rather
              // than floating over it in a wrapper, which is what stopped the
              // input from taking the full width of the row.
              iconAfter: RevealToggle.render({
                isPasswordVisible: entity.isPasswordVisible,
                inputId: "login_password",
                onTogglePassword,
              }),
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
            children: SubmitButton.render({ isBusy, label: "Log in" }),
          })}
        </form>
      </div>
    `
  },
}
