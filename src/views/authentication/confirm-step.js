import { Button } from "@inglorious/ui/button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"
import { getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { FormActions } from "../../common/form-actions/index.js"
import { t, trans } from "../../i18n/index.js"
import styles from "./style.module.css"
import { SubmitButton } from "./submit-button"

// After signup, until the link in the email is clicked. Nothing here can sign
// the visitor in: the link opens onboarding in its own tab, with the session.
export const ConfirmStep = {
  render({ entity, isBusy, onResend, onBackToEmail }) {
    return html`
      <div class=${styles.step} key="confirm">
        <form
          class=${styles.form}
          action=""
          novalidate
          @submit=${(e) => {
            e.preventDefault()
            onResend()
          }}
        >
          <h2 class=${styles.title}>${t("auth.checkInbox")}</h2>
          <p class=${styles.subtitle}>
            ${trans("auth.confirmationSent", {
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
          ${when(
            entity.isResent,
            () =>
              html`<p class=${styles.subtitle}>
                ${t("auth.confirmationResent")}
              </p>`,
          )}
          ${ErrorAlert.render({ error: entity.error, className: styles.error })}
          ${FormActions.render({
            children: SubmitButton.render({
              isBusy,
              label: t("auth.resendConfirmation"),
            }),
          })}
        </form>
      </div>
    `
  },
}
