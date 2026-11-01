import { Button } from "@inglorious/ui/button"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ChipPicker } from "../../common/chip-picker/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { ErrorLabel } from "../../common/error-label/index.js"
import { FormActions } from "../../common/form-actions/index.js"
import { JobTypeRequest } from "../../common/job-type-request/index.js"
import { Page } from "../../common/page/index.js"
import { professions } from "../../data/event-taxonomy.js"
import { ITALY } from "../../data/regions/resolve.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

export const Onboarding = {
  render(props, api) {
    return this.renderOnboarding(props, api)
  },

  renderOnboarding(
    { entity, onField, onToggleProfession, onSave, onSkip },
    api,
  ) {
    const saving = entity.status === "saving"
    const countryError = getFieldError(entity, "country")

    return Page.render({
      variant: "centered",
      children: [
        html`
          <h2 class=${styles.title}>${t("onboarding.title")}</h2>
          <p class=${styles.subtitle}>${t("onboarding.subtitle")}</p>

          <div class=${styles.field}>
            ${ChipPicker.render({
              label: t("fields.professions"),
              hint: t("fields.professionsHint"),
              options: professions,
              value: getFieldValue(entity, "professions", []),
              isDisabled: saving,
              onToggle: onToggleProfession,
            })}
          </div>

          <div class=${styles.field}>
            ${api.render("jobTypesOnboarding")}
            <p class=${styles.hint}>
              ${t("fields.jobTypesHint")} ${JobTypeRequest.render()}
            </p>
          </div>

          <div
            class=${
              countryError
                ? `${styles.field} ${styles.fieldError}`
                : styles.field
            }
          >
            <span>${t("fields.country")}</span>
            ${api.render("countryOnboarding")}
            ${ErrorLabel.render({ error: countryError })}
          </div>
          ${when(
            getFieldValue(entity, "country", "") === ITALY,
            () => html`
              <div class=${styles.field}>
                <span>${t("fields.regionOptional")}</span>
                ${api.render("regionOnboarding")}
              </div>
            `,
            () => html`
              <div class=${styles.field}>
                ${Input.render({
                  id: "onboarding-region",
                  label: t("fields.regionOptional"),
                  inputType: "text",
                  value: getFieldValue(entity, "region", ""),
                  placeholder: t("fields.regionExample"),
                  isFullWidth: true,
                  onChange: (value) => onField({ field: "region", value }),
                })}
              </div>
            `,
          )}
          <div class=${styles.field}>
            ${Input.render({
              id: "onboarding-website",
              label: t("fields.websiteOptional"),
              inputType: "url",
              value: getFieldValue(entity, "website", ""),
              placeholder: t("fields.websiteExample"),
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
              id: "onboarding-phone",
              label: t("fields.phoneOptional"),
              inputType: "tel",
              value: getFieldValue(entity, "phone", ""),
              placeholder: t("fields.phoneExample"),
              hint: t("fields.phoneHint"),
              isFullWidth: true,
              onChange: (value) => onField({ field: "phone", value }),
              autocomplete: "tel",
              inputmode: "tel",
            })}
          </div>

          ${ErrorAlert.render({ error: entity.error, className: styles.error })}
          ${FormActions.render({
            children: [
              Button.render({
                children: saving ? t("common.saving") : t("auth.continue"),
                color: "primary",
                shape: "pill",
                size: "md",
                isFullWidth: true,
                isDisabled: saving,
                onClick: onSave,
              }),
              Button.render({
                children: t("onboarding.skip"),
                variant: "ghost",
                color: "primary",
                size: "sm",
                isDisabled: saving,
                onClick: onSkip,
              }),
            ],
          })}
        `,
      ],
    })
  },
}
