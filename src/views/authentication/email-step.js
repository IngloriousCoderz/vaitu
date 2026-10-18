import { Flex } from "@inglorious/ui/flex"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import styles from "./style.module.css"
import { SubmitButton } from "./submit-button"

export const EmailStep = {
  render({ entity, isBusy, onField, onCheckEmail }) {
    return html`
      <div class=${styles.step} key="email">
        <form
          class=${styles.form}
          action=""
          novalidate
          @submit=${(e) => {
            e.preventDefault()
            onCheckEmail()
          }}
        >
          <h2 class=${styles.title}>Welcome to Vaitu</h2>
          <p class=${styles.subtitle}>Enter your email to continue.</p>
          <div class=${styles.field}>
            ${Input.render({
              id: "email-step-email",
              label: "Email",
              inputType: "email",
              name: "email",
              value: getFieldValue(entity, "email", ""),
              placeholder: "you@example.com",
              isFullWidth: true,
              isRequired: true,
              error: getFieldError(entity, "email"),
              onChange: (value) => onField({ field: "email", value }),
              autocomplete: "username",
              autocapitalize: "none",
              autocorrect: "off",
              spellcheck: "false",
            })}
          </div>
          ${ErrorAlert.render({ error: entity.error, className: styles.error })}
          ${Flex.render({
            direction: "column",
            align: "stretch",
            className: styles.bottomBar,
            children: SubmitButton.render({
              isBusy,
              label: "Continue",
              busyLabel: "Checking...",
            }),
          })}
        </form>
      </div>
    `
  },
}
