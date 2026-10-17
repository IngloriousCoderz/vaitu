import { Alert } from "@inglorious/ui/alert"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { IconButton } from "@inglorious/ui/icon-button"
import { MaterialIcon } from "@inglorious/ui/material-icon"
import { Textarea } from "@inglorious/ui/textarea"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { Card } from "../../common/event-card/index.js"
import { Page } from "../../common/page/index.js"
import { capitalize } from "../../text/index.js"
import { calendarLinks } from "./helpers.js"
import styles from "./style.module.css"

const statusColors = {
  pending: "default",
  shortlisted: "info",
  selected: "success",
  rejected: "error",
}

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
    onAskGiveUp,
    onGiveUp,
    onCancelGiveUp,
    onCancelWithdraw,
    onGoogleCalendar,
    onDownloadIcs,
    onBack,
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
            location: application.subtitle,
          })
        : null

    return Page.render({
      variant: "document",
      wide: true,
      category: application?.category ?? "wedding",
      children: [
        html`
          ${IconButton.render({
            icon: MaterialIcon.render({ name: "arrow_back", size: "lg" }),
            label: "Back",
            variant: "ghost",
            ariaLabel: "Back",
            onClick: onBack,
          })}
          ${
            status === "loading"
              ? html`<p class=${styles.empty}>Loading application…</p>`
              : !application
                ? html`<p class=${styles.empty}>${error}</p>`
                : html`
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
                      ${Chip.render({
                        children: capitalize(application.applicationStatus),
                        color:
                          statusColors[application.applicationStatus] ??
                          "default",
                      })}
                    </div>
                    ${
                      links
                        ? html`
                            <h3 class=${styles.sectionTitle}>
                              Add to calendar
                            </h3>
                            <div class=${styles.calendarRow}>
                              ${Button.render({
                                children: "Google Calendar",
                                color: "primary",
                                shape: "pill",
                                size: "md",
                                isFullWidth: true,
                                onClick: () =>
                                  onGoogleCalendar(links.googleUrl),
                              })}
                              ${Button.render({
                                children: "Download .ics",
                                variant: "outline",
                                shape: "pill",
                                size: "md",
                                isFullWidth: true,
                                onClick: () =>
                                  onDownloadIcs(application.title, links.ics),
                              })}
                            </div>
                          `
                        : ""
                    }
                    ${
                      application.applicationStatus === "pending" ||
                      application.applicationStatus === "shortlisted"
                        ? html`
                            <h3 class=${styles.sectionTitle}>
                              Your motivation
                            </h3>
                            <div class=${styles.field}>
                              ${Textarea.render({
                                id: "application-motivation",
                                value: motivation,
                                rows: 5,
                                isFullWidth: true,
                                error: getFieldError(entity, "motivation"),
                                onChange: (value) =>
                                  onField({ field: "motivation", value }),
                              })}
                            </div>
                            ${Button.render({
                              children:
                                status === "saving"
                                  ? "Saving…"
                                  : "Save changes",
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
                          `
                        : ""
                    }
                    ${
                      error && status !== "loading"
                        ? Alert.render({
                            severity: "error",
                            className: `vaitu-alert ${styles.error}`,
                            children: error,
                          })
                        : ""
                    }
                    ${
                      application.applicationStatus === "selected"
                        ? entity.isConfirmingGiveUp
                          ? html`
                              <p class=${styles.warn}>
                                Give up this event? The organizer will need to
                                pick another winner.
                              </p>
                              <div class=${styles.withdrawRow}>
                                ${Button.render({
                                  children:
                                    status === "saving"
                                      ? "Giving up…"
                                      : "Yes, give up",
                                  color: "error",
                                  variant: "outline",
                                  shape: "pill",
                                  size: "md",
                                  isFullWidth: true,
                                  isDisabled: isBusy,
                                  onClick: () => {
                                    if (!isBusy) onGiveUp()
                                  },
                                })}
                                ${Button.render({
                                  children: "Keep it",
                                  variant: "outline",
                                  shape: "pill",
                                  size: "md",
                                  isFullWidth: true,
                                  onClick: onCancelGiveUp,
                                })}
                              </div>
                            `
                          : html`
                              ${Button.render({
                                children: "Give up this event",
                                color: "error",
                                variant: "outline",
                                shape: "pill",
                                size: "md",
                                isFullWidth: true,
                                className: styles.withdrawButton,
                                onClick: onAskGiveUp,
                              })}
                            `
                        : entity.isConfirmingWithdraw
                          ? html`
                              <p class=${styles.warn}>
                                Are you sure you want to withdraw your
                                application? The organizer will no longer see
                                it.
                              </p>
                              <div class=${styles.withdrawRow}>
                                ${Button.render({
                                  children:
                                    status === "withdrawing"
                                      ? "Withdrawing…"
                                      : "Yes, withdraw",
                                  color: "error",
                                  variant: "outline",
                                  shape: "pill",
                                  size: "md",
                                  isFullWidth: true,
                                  isDisabled: isBusy,
                                  onClick: () => {
                                    if (!isBusy) onWithdraw()
                                  },
                                })}
                                ${Button.render({
                                  children: "Keep it",
                                  variant: "outline",
                                  shape: "pill",
                                  size: "md",
                                  isFullWidth: true,
                                  onClick: onCancelWithdraw,
                                })}
                              </div>
                            `
                          : html`
                              ${Button.render({
                                children: "Withdraw application",
                                color: "error",
                                variant: "outline",
                                shape: "pill",
                                size: "md",
                                isFullWidth: true,
                                className: styles.withdrawButton,
                                onClick: onAskWithdraw,
                              })}
                            `
                    }
                      </div>
                    </div>
                  `
          }
        `,
      ],
    })
  },
}
