import { Alert } from "@inglorious/ui/alert"
import { Button } from "@inglorious/ui/button"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { renderPage } from "../../page.js"
import { ITALY } from "../../regions.js"
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

    return renderPage({
      variant: "centered",
      children: [
        html`
          <h2 class=${styles.title}>Complete your profile</h2>
          <p class=${styles.subtitle}>
            Tell us where you are so organizers can find you.
          </p>

          <label
            class=${
              countryError
                ? `${styles.field} ${styles.fieldError}`
                : styles.field
            }
          >
            <span>Country</span>
            ${renderCountry()} ${fieldMessage(countryError)}
          </label>
          ${
            getFieldValue(entity, "country", "") === ITALY
              ? html`
                  <label class=${styles.field}>
                    <span>Region (optional)</span>
                    ${renderRegion()}
                  </label>
                `
              : html`
                  <label class=${styles.field}>
                    <span>Region (optional)</span>
                    <input
                      type="text"
                      placeholder="Tuscany"
                      .value=${getFieldValue(entity, "region", "")}
                      @input=${(e) =>
                        onField({ field: "region", value: e.target.value })}
                    />
                  </label>
                `
          }
          <label class=${styles.field}>
            <span>Website (optional)</span>
            <input
              type="url"
              placeholder="your-site.com"
              autocapitalize="none"
              autocorrect="off"
              autocomplete="off"
              spellcheck="false"
              inputmode="url"
              .value=${getFieldValue(entity, "website", "")}
              @input=${(e) =>
                onField({
                  field: "website",
                  value: e.target.value.toLowerCase(),
                })}
            />
          </label>
          <label class=${styles.field}>
            <span>Instagram (optional)</span>
            <input
              type="text"
              placeholder="@handle"
              autocapitalize="none"
              autocorrect="off"
              autocomplete="off"
              spellcheck="false"
              .value=${getFieldValue(entity, "instagram", "")}
              @input=${(e) =>
                onField({
                  field: "instagram",
                  value: e.target.value.toLowerCase(),
                })}
            />
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
            ${Button.render({
              children: saving ? "Saving…" : "Continue",
              color: "primary",
              shape: "pill",
              size: "md",
              isFullWidth: true,
              isDisabled: saving,
              onClick: onSave,
            })}
            <button class=${styles.linkButton} type="button" @click=${onSkip}>
              Skip for now
            </button>
          </div>
        `,
      ],
    })
  },
}

function fieldMessage(message) {
  return message ? html`<p class=${styles.fieldMessage}>${message}</p>` : ""
}
