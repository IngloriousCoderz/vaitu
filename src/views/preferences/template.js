import { Flex } from "@inglorious/ui/flex"
import { Switch } from "@inglorious/ui/switch"
import { html } from "@inglorious/web"

import { ChipPicker } from "../../common/chip-picker/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { JobTypeRequest } from "../../common/job-type-request/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { professions } from "../../data/event-taxonomy.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

export const Preferences = {
  render(props, api) {
    return this.renderPreferences(props, api)
  },

  renderPreferences(
    { entity, onToggleProfession, onEmails, onNewEventAlerts },
    api,
  ) {
    return Page.render({
      variant: "document",
      read: true,
      children: [
        PageStatus.render({
          isError: entity.status === "error",
          error: entity.error,
          isLoading: entity.status !== "ready",
        }) ??
          html`
            <h2 class=${styles.sectionTitle}>${t("preferences.feed")}</h2>
            <p class=${styles.sectionHint}>${t("preferences.feedHint")}</p>
            ${Flex.render({
              direction: "column",
              gap: "lg",
              children: [
                ChipPicker.render({
                  label: t("fields.professions"),
                  hint: t("fields.professionsHint"),
                  options: professions,
                  value: entity.professions,
                  onToggle: onToggleProfession,
                }),
                html`<div>
                  ${api.render("jobTypesPreferences")}
                  <p class=${styles.sectionHint}>
                    ${t("fields.jobTypesHint")} ${JobTypeRequest.render()}
                  </p>
                </div>`,
                html`<div>
                  ${api.render("favoriteRegionPreferences")}
                  <p class=${styles.sectionHint}>
                    ${t("fields.favoriteRegionsHint")}
                  </p>
                </div>`,
              ],
            })}

            <h2 class=${styles.sectionTitle}>${t("preferences.app")}</h2>
            ${Flex.render({
              direction: "column",
              gap: "lg",
              children: [
                html`<div class=${styles.language}>
                  <span class=${styles.legend}
                    >${t("preferences.language")}</span
                  >
                  ${api.render("language")}
                </div>`,
                Switch.render({
                  label: t("preferences.newEventAlerts"),
                  description: t("preferences.newEventAlertsDescription"),
                  isChecked: entity.has_new_event_alerts,
                  onChange: onNewEventAlerts,
                }),
                Switch.render({
                  label: t("preferences.emails"),
                  description: t("preferences.emailsDescription"),
                  isChecked: !entity.is_email_opted_out,
                  onChange: onEmails,
                }),
                Switch.render({
                  label: t("preferences.analytics"),
                  description: t("preferences.analyticsDescription"),
                  isChecked: api.getEntity("analytics")?.consent === "granted",
                  onChange: (isOn) =>
                    api.notify("#analytics:analyticsConsent", isOn),
                }),
              ],
            })}
            ${ErrorAlert.render({
              error: entity.saveError,
              className: styles.error,
            })}
          `,
      ],
    })
  },
}
