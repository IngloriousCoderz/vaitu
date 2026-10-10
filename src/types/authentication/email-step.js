import { html } from "@inglorious/web"

import { ErrorLabel } from "./error-label"
import styles from "./style.module.css"
import { SubmitButton } from "./submit-button"

export const EmailStep = {
  render({ entity, isBusy, onField, onCheckEmail }) {
    return html`
      <div class=${styles.step} key="email">
        <form
          class=${styles.form}
          action=""
          @submit=${(e) => {
            e.preventDefault()
            onCheckEmail()
          }}
        >
          <h2 class=${styles.title}>Welcome to vaitu</h2>
          <p class=${styles.subtitle}>Enter your email to continue.</p>
          <label class=${styles.field}>
            <span>Email</span>
            <input
              type="email"
              name="email"
              autocomplete="username"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              placeholder="you@example.com"
              .value=${entity.email}
              @input=${(e) => onField({ field: "email", value: e.target.value })}
            />
          </label>
          ${ErrorLabel.render({ error: entity.error })}
          <div class=${styles.bottomBar}>
            ${SubmitButton.render({
              isBusy,
              label: "Continue",
              busyLabel: "Checking...",
            })}
          </div>
        </form>
      </div>
    `
  },
}
