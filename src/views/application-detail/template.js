import { Button } from "@inglorious/ui/button"
import { Rating } from "@inglorious/ui/rating"
import { Textarea } from "@inglorious/ui/textarea"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ConfirmDialog } from "../../common/confirm-dialog/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { Card } from "../../common/job-card/index.js"
import { isSettlementOpen, JobDeal } from "../../common/job-deal/index.js"
import { LoadStatus } from "../../common/load-status/index.js"
import { Page } from "../../common/page/index.js"
import { isUnpaid } from "../../common/pay.js"
import { SafetyButton } from "../../common/safety/index.js"
import { StatusChip } from "../../common/status-chip/index.js"
import { t } from "../../i18n/index.js"
import { calendarLinks } from "./helpers.js"
import styles from "./style.module.css"

export const template = {
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
    onReportReview,
    onDealAnswer,
    onDealSettle,
  }) {
    const { application, status, error } = entity
    const isBusy = status === "saving" || status === "withdrawing"
    const motivation = getFieldValue(entity, "motivation", "")
    const canSave = application && !isBusy
    const links =
      application?.applicationStatus === "selected"
        ? calendarLinks({
            title: application.title,
            jobDate: application.job_date,
            location: application.place,
          })
        : null

    return Page.render({
      variant: "document",
      wide: true,
      setting: application?.setting ?? "wedding",
      children: [
        html`
          ${LoadStatus.render({
            isError: status !== "loading" && !application,
            error,
            isLoading: status === "loading" && !application,
            content: () => html`
              <div class=${styles.stage}>
                <div class=${styles.story}>
                  ${Card.render({
                    job: application,
                    cover: true,
                    hero: true,
                  })}
                </div>
                <div class=${styles.panel}>
                  <div class=${styles.statusRow}>
                    ${StatusChip.render({ status: application.applicationStatus })}
                  </div>
                  ${when(
                    application.applicationStatus === "selected" &&
                      !isUnpaid(application.pay),
                    () =>
                      JobDeal.render({
                        role: "winner",
                        agreement: application.agreement,
                        settlements: application.settlements,
                        isSettlementDue: isSettlementOpen({
                          agreement: application.agreement,
                          status: application.applicationStatus,
                          job_date: application.job_date,
                          review: application.review,
                        }),
                        isBusy: entity.isDealBusy,
                        error: entity.dealError,
                        onAnswer: onDealAnswer,
                        onSettle: onDealSettle,
                      }),
                  )}
                  ${when(application.review, () =>
                    this.renderReview(application.review, onReportReview),
                  )}
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
                          error: t(getFieldError(entity, "motivation")),
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
                  ${when(!application.review, () =>
                    Button.render({
                      children: t("application.withdraw"),
                      color: "error",
                      variant: "outline",
                      shape: "pill",
                      size: "md",
                      isFullWidth: true,
                      className: styles.withdrawButton,
                      onClick: onAskWithdraw,
                    }),
                  )}
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
            `,
          })}
        `,
      ],
    })
  },

  renderReview(review, onReportReview) {
    return html`
      <h3 class=${styles.sectionTitle}>${t("reputation.yourReview")}</h3>
      <p>${t(`reputation.outcome.${review.outcome}`)}</p>
      ${when(review.rating, () =>
        Rating.render({
          value: review.rating,
          isReadOnly: true,
          ariaLabel: t("reputation.ratingLabel"),
        }),
      )}
      ${when(review.comment, () => html`<p>${review.comment}</p>`)}
      ${when(review.comment, () =>
        SafetyButton.render({
          onClick: onReportReview,
          label: t("safety.reportReview"),
        }),
      )}
    `
  },
}
