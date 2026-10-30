import { Button } from "@inglorious/ui/button"
import { Textarea } from "@inglorious/ui/textarea"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ConfirmDialog } from "../../common/confirm-dialog/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { Card } from "../../common/event-card/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { StatusChip } from "../../common/status-chip/index.js"
import { t, translated } from "../../i18n/index.js"
import { calendarLinks } from "./helpers.js"
import styles from "./style.module.css"

export const ApplicationDetail = {
  render(props, api) {
    return this.renderApplicationDetail(props, api)
  },

  renderApplicationDetail({
    entity,
    onField,
    onSave,
    onAskWithdraw,
    onWithdraw,
    onCancelWithdraw,
    onGoogleCalendar,
    onDownloadIcs,
  }) {
    const { application, status, error } = entity
    const isBusy = status === "saving" || status === "withdrawing"
    const motivation = getFieldValue(entity, "motivation", "")
    const canSave = application && !isBusy
    const links =
      application?.applicationStatus === "selected"
        ? calendarLinks({
            title: application.title,
            eventDate: application.event_date,
            location: application.place,
          })
        : null

    return Page.render({
      variant: "document",
      wide: true,
      category: application?.category ?? "wedding",
      children: [
        html`
          ${
            PageStatus.render({
              isError: status !== "loading" && !application,
              error,
              isLoading: status === "loading" && !application,
            }) ??
            html`
              <div class=${styles.stage}>
                <div class=${styles.story}>
                  ${Card.render({
                    event: application,
                    cover: true,
                    hero: true,
                  })}
                </div>
                <div class=${styles.panel}>
                  <div class=${styles.statusRow}>
                    ${StatusChip.render({ status: application.applicationStatus })}
                  </div>
                  ${when(
                    links,
                    () => html`
                      <h3 class=${styles.sectionTitle}>
                        ${t("application.addToCalendar")}
                      </h3>
                      <div class=${styles.calendarRow}>
                        ${Button.render({
                          children: t("application.googleCalendar"),
                          color: "primary",
                          shape: "pill",
                          size: "md",
                          isFullWidth: true,
                          onClick: () => onGoogleCalendar(links.googleUrl),
                        })}
                        ${Button.render({
                          children: t("application.downloadIcs"),
                          variant: "outline",
                          shape: "pill",
                          size: "md",
                          isFullWidth: true,
                          onClick: () =>
                            onDownloadIcs(application.title, links.ics),
                        })}
                      </div>
                    `,
                  )}
                  ${when(
                    application.applicationStatus === "pending" ||
                      application.applicationStatus === "shortlisted",
                    () => html`
                      <h3 class=${styles.sectionTitle}>
                        ${t("application.yourMotivation")}
                      </h3>
                      <div class=${styles.field}>
                        ${Textarea.render({
                          id: "application-motivation",
                          value: motivation,
                          rows: 5,
                          isFullWidth: true,
                          error: translated(
                            getFieldError(entity, "motivation"),
                          ),
                          onChange: (value) =>
                            onField({ field: "motivation", value }),
                        })}
                      </div>
                      ${Button.render({
                        children:
                          status === "saving"
                            ? t("common.saving")
                            : t("create.saveChanges"),
                        color: "primary",
                        shape: "pill",
                        size: "md",
                        isFullWidth: true,
                        isDisabled: !canSave,
                        className: styles.saveButton,
                        onClick: () => {
                          if (canSave) onSave()
                        },
                      })}
                    `,
                  )}
                  ${ErrorAlert.render({
                    error: error && status !== "loading" ? error : null,
                    className: styles.error,
                  })}
                  ${Button.render({
                    children: t("application.withdraw"),
                    color: "error",
                    variant: "outline",
                    shape: "pill",
                    size: "md",
                    isFullWidth: true,
                    className: styles.withdrawButton,
                    onClick: onAskWithdraw,
                  })}
                  ${ConfirmDialog.render({
                    id: "withdraw-confirm",
                    isOpen: entity.isConfirmingWithdraw,
                    message:
                      application.applicationStatus === "selected"
                        ? t("application.withdrawWinnerConfirm")
                        : t("application.withdrawConfirm"),
                    error: status === "error" ? error : null,
                    confirmLabel: t("application.yesWithdraw"),
                    busyLabel: t("application.withdrawing"),
                    isBusy: status === "withdrawing",
                    onConfirm: onWithdraw,
                    onCancel: onCancelWithdraw,
                  })}
                </div>
              </div>
            `
          }
        `,
      ],
    })
  },
}
