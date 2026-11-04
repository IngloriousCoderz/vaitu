import { Button } from "@inglorious/ui/button"
import { Checkbox } from "@inglorious/ui/checkbox"
import { ChipPicker } from "@inglorious/ui/chip-picker"
import { Flex } from "@inglorious/ui/flex"
import { Switch } from "@inglorious/ui/switch"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { JobTypeRequest } from "../../common/job-type-request/index.js"
import { LoadStatus } from "../../common/load-status/index.js"
import { Page } from "../../common/page/index.js"
import { professions } from "../../data/job-taxonomy.js"
import {
  ALL_TYPES,
  isMuted,
  notificationGroups,
} from "../../data/notification-types.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

export const template = {
  render(props, api) {
    return this.renderPreferences(props, api)
  },

  renderPreferences(
    {
      entity,
      isAnalyticsOn,
      onToggleProfession,
      onNotificationToggle,
      onAnalyticsToggle,
      onUnblock,
    },
    api,
  ) {
    return Page.render({
      variant: "document",
      read: true,
      children: [
        LoadStatus.render({
          isError: entity.status === "error",
          error: entity.error,
          isLoading: entity.status !== "ready",
          content: () => html`
            <h2 class=${styles.sectionTitle}>${t("preferences.feed")}</h2>
            <p class=${styles.sectionHint}>${t("preferences.feedHint")}</p>
            ${Flex.render({
              direction: "column",
              gap: "lg",
              children: [
                ChipPicker.render({
                  label: t("fields.professions"),
                  hint: t("fields.professionsHint"),
                  options: professions.map(({ id, label }) => ({
                    value: id,
                    label: t(label),
                  })),
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
            ${this.renderNotifications({ entity, onNotificationToggle })}

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
                  label: t("preferences.analytics"),
                  description: t("preferences.analyticsDescription"),
                  isChecked: isAnalyticsOn,
                  onChange: onAnalyticsToggle,
                }),
              ],
            })}
            <h2 class=${styles.sectionTitle}>${t("safety.blockedTitle")}</h2>
            ${when(
              entity.blocks.length,
              () =>
                Flex.render({
                  direction: "column",
                  gap: "sm",
                  children: entity.blocks.map((block) =>
                    Flex.render({
                      align: "center",
                      justify: "between",
                      gap: "sm",
                      children: [
                        html`<span
                          >${block.blocked_name ?? t("common.deletedUser")}</span
                        >`,
                        Button.render({
                          children: t("safety.unblock"),
                          variant: "outline",
                          shape: "pill",
                          size: "sm",
                          onClick: () => onUnblock(block.blocked_id),
                        }),
                      ],
                    }),
                  ),
                }),
              () =>
                html`<p class=${styles.sectionHint}>
                  ${t("safety.blockedNone")}
                </p>`,
            )}
            ${ErrorAlert.render({
              error: entity.saveError,
              className: styles.error,
            })}
          `,
        }),
      ],
    })
  },

  renderNotifications({ entity, onNotificationToggle }) {
    const row = (label, type) => html`
      <div class=${styles.notificationRow}>
        <span>${label}</span>
        ${["muted_email_types", "muted_push_types"].map((column) =>
          this.renderNotificationCheckbox({
            entity,
            column,
            type,
            label,
            onNotificationToggle,
          }),
        )}
      </div>
    `
    return html`
      <h2 class=${styles.sectionTitle}>
        ${t("preferences.notifications.title")}
      </h2>
      <p class=${styles.sectionHint}>${t("preferences.notifications.hint")}</p>
      <div class=${styles.notifications}>
        <div class="${styles.notificationRow} ${styles.notificationHead}">
          <span></span>
          <span>${t("preferences.notifications.email")}</span>
          <span>${t("preferences.notifications.push")}</span>
        </div>
        ${row(t("preferences.notifications.all"), ALL_TYPES)}
        ${notificationGroups.map(
          ({ id, types }) => html`
            <h3 class=${styles.notificationGroup}>
              ${t(`preferences.notifications.groups.${id}`)}
            </h3>
            ${types.map((type) =>
              row(t(`preferences.notifications.types.${type}`), type),
            )}
          `,
        )}
      </div>
      <p class=${styles.sectionHint}>
        ${t("preferences.notifications.newJobsHint")}
      </p>
    `
  },

  renderNotificationCheckbox({
    entity,
    column,
    type,
    label,
    onNotificationToggle,
  }) {
    const channel = t(
      `preferences.notifications.${
        column === "muted_email_types" ? "email" : "push"
      }`,
    )
    const muted = entity[column]
    return html`<span class=${styles.notificationCheck}>
      ${Checkbox.render({
        "aria-label": `${label}: ${channel}`,
        isChecked: !isMuted(muted, type),
        isDisabled: type !== ALL_TYPES && muted.includes(ALL_TYPES),
        onChange: (isReceiving) =>
          onNotificationToggle({ column, type, isReceiving }),
      })}
    </span>`
  },
}
