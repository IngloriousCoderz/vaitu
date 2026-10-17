import { Button } from "@inglorious/ui/button"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { ErrorLabel } from "../../common/error-label/index.js"
import { Page } from "../../common/page/index.js"
import { ITALY } from "../../data/regions/resolve.js"
import styles from "./style.module.css"

export const Onboarding = {
  render(props, api) {
    return this.renderOnboarding(props, api)
  },

  renderOnboarding({
    entity,
    onField,
    onSave,
    onSkip,
    renderCountry,
    renderRegion,
  }) {
    const saving = entity.status === "saving"
    const countryError = getFieldError(entity, "country")

    return Page.render({
      variant: "centered",
      children: [
        html`
          <h2 class=${styles.title}>Complete your profile</h2>
          <p class=${styles.subtitle}>
            Tell us where you are so organizers can find you.
          </p>

          <div
            class=${
              countryError
                ? `${styles.field} ${styles.fieldError}`
                : styles.field
            }
          >
            <span>Country</span>
            ${renderCountry()} ${ErrorLabel.render({ error: countryError })}
          </div>
          ${
            getFieldValue(entity, "country", "") === ITALY
              ? html`
                  <div class=${styles.field}>
                    <span>Region (optional)</span>
                    ${renderRegion()}
                  </div>
                `
              : html`
                  <div class=${styles.field}>
                    ${Input.render({
                      id: "onboarding-region",
                      label: "Region (optional)",
                      inputType: "text",
                      value: getFieldValue(entity, "region", ""),
                      placeholder: "Tuscany",
                      isFullWidth: true,
                      onChange: (value) => onField({ field: "region", value }),
                    })}
                  </div>
                `
          }
          <div class=${styles.field}>
            ${Input.render({
              id: "onboarding-website",
              label: "Website (optional)",
              inputType: "url",
              value: getFieldValue(entity, "website", ""),
              placeholder: "your-site.com",
              isFullWidth: true,
              onChange: (value) =>
                onField({ field: "website", value: value.toLowerCase() }),
              autocapitalize: "none",
              autocorrect: "off",
              autocomplete: "off",
              spellcheck: "false",
              inputmode: "url",
            })}
          </div>
          <div class=${styles.field}>
            ${Input.render({
              id: "onboarding-instagram",
              label: "Instagram (optional)",
              icon: "@",
              value: getFieldValue(entity, "instagram", ""),
              placeholder: "handle",
              isFullWidth: true,
              onChange: (value) =>
                onField({ field: "instagram", value: value.toLowerCase() }),
              autocapitalize: "none",
              autocorrect: "off",
              autocomplete: "off",
              spellcheck: "false",
            })}
          </div>

          ${ErrorAlert.render({ error: entity.error, className: styles.error })}
          <div class=${styles.bottomBar}>
            ${Button.render({
              children: saving ? "Saving…" : "Continue",
              color: "primary",
              shape: "pill",
              size: "md",
              isFullWidth: true,
              isDisabled: saving,
              onClick: onSave,
            })}
            ${Button.render({
              children: "Skip for now",
              variant: "ghost",
              size: "sm",
              className: styles.linkButton,
              onClick: onSkip,
            })}
          </div>
        `,
      ],
    })
  },
}
