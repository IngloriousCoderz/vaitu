import { Button } from "@inglorious/ui/button"
import { Card } from "@inglorious/ui/card"
import { Input } from "@inglorious/ui/input"
import { MaterialIcon } from "@inglorious/ui/material-icon"
import { html } from "@inglorious/web"
import { getFieldError } from "@inglorious/web/form"

import { ConfirmPrompt } from "../../common/confirm-prompt/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { StatusChip } from "../../common/status-chip/index.js"
import {
  DATE_ISO_LENGTH,
  DATETIME_LOCAL_LENGTH,
  SINGULAR,
} from "../../constants/index.js"
import styles from "./style.module.css"

export const ApplicationsReceived = {
  render(props, api) {
    return this.renderApplicationsReceived(props, api)
  },

  renderApplicationsReceived({
    entity,
    onToggle,
    onSelect,
    onReject,
    onUnshortlist,
    onUnreject,
    onAskAssign,
    onAssign,
    onCancelAssign,
    onAskReopen,
    onReopenDeadline,
    onReopen,
    onCancelReopen,
  }) {
    const { items, status, error } = entity
    const selected_count = items.filter(
      (i) => i.status === "shortlisted",
    ).length
    const max_reached =
      entity.max_applicants != null && selected_count >= entity.max_applicants

    return Page.render({
      variant: "stickyFlat",
      wide: true,
      children: [
        html`
          <header class=${styles.header}>
            ${
              entity.event_status === "assigned" ||
              entity.event_status === "closed"
                ? html`
                    ${
                      entity.confirming_reopen
                        ? ConfirmPrompt.render({
                            message:
                              entity.event_status === "assigned"
                                ? "Reopen this event? Applications keep their status and you can adjust the shortlist again."
                                : "Reopen this event? New applications will be accepted again.",
                            children: deadlinePast(entity.event_deadline)
                              ? html`
                                  <div class=${styles.field}>
                                    <span>New application deadline</span>
                                    ${Input.render({
                                      id: "received-reopen-deadline",
                                      inputType: "datetime-local",
                                      value: entity.reopen_deadline ?? "",
                                      isFullWidth: true,
                                      error: getFieldError(
                                        entity,
                                        "reopen_deadline",
                                      ),
                                      onChange: onReopenDeadline,
                                    })}
                                  </div>
                                `
                              : "",
                            confirmLabel: "Yes, reopen",
                            busyLabel: "Reopening…",
                            cancelLabel:
                              entity.event_status === "assigned"
                                ? "Keep assigned"
                                : "Keep closed",
                            tone: "primary",
                            isBusy: status === "saving",
                            isDisabled:
                              deadlinePast(entity.event_deadline) &&
                              (entity.reopen_deadline ?? "").length !==
                                DATETIME_LOCAL_LENGTH,
                            onConfirm: onReopen,
                            onCancel: onCancelReopen,
                          })
                        : html`
                            ${Button.render({
                              children: "Reopen event",
                              color: "primary",
                              shape: "pill",
                              size: "md",
                              isFullWidth: true,
                              onClick: onAskReopen,
                            })}
                          `
                    }
                  `
                : ""
            }
          </header>

          ${
            entity.event_recap
              ? this.renderRecap(
                  entity.event_recap,
                  selected_count,
                  entity.max_applicants,
                )
              : ""
          }

          <main class=${styles.list}>
            ${
              PageStatus.render({
                isError: status === "error" && !items.length,
                error,
                isLoading: status === "loading",
                loadingText: "Loading applications…",
                isEmpty: !items.length,
                emptyText:
                  entity.event_status === "open"
                    ? "No applications yet."
                    : "No applications received.",
              }) ??
              items.map((item) =>
                this.renderApplicant({
                  item,
                  expanded: entity.expanded_application_id === item.id,
                  max_reached,
                  confirming_assign: entity.confirming_assign === item.id,
                  event_assigned: entity.event_status === "assigned",
                  onToggle,
                  onSelect,
                  onReject,
                  onUnshortlist,
                  onUnreject,
                  onAskAssign,
                  onAssign,
                  onCancelAssign,
                }),
              )
            }
            ${ErrorAlert.render({
              error:
                status === "error" && items.length >= SINGULAR ? error : null,
              className: styles.error,
            })}
          </main>
        `,
      ],
    })
  },

  renderRecap(recap, shortlisted, maxApplicants) {
    const rows = [
      ["Status", prettyValue(recap.status)],
      ["Names", recap.names || "—"],
      ["Style", prettyValue(recap.style)],
      ["Location", recap.location || "—"],
      ["Event date", formatDay(recap.event_date)],
      ["Application deadline", formatDeadline(recap.application_deadline)],
      ["Shortlist", `${shortlisted}/${maxApplicants ?? "—"}`],
      [
        "Created",
        formatDay((recap.created_at ?? "").slice(0, DATE_ISO_LENGTH)),
      ],
    ]
    return Card.render({
      element: "div",
      className: styles.recap,
      body: html`
        <dl class=${styles.recapList}>
          ${rows.map(
            ([label, value]) => html`
              <div class=${styles.recapRow}>
                <dt>${label}</dt>
                <dd>${value}</dd>
              </div>
            `,
          )}
        </dl>
      `,
    })
  },

  renderApplicant({
    item,
    expanded,
    max_reached,
    confirming_assign,
    event_assigned,
    onToggle,
    onSelect,
    onReject,
    onUnshortlist,
    onUnreject,
    onAskAssign,
    onAssign,
    onCancelAssign,
  }) {
    const applicant = item.applicant ?? {}
    const instagram = (applicant.instagram_handle ?? "")
      .trim()
      .replace(/^@+/, "")
    return html`
      <article class=${styles.card}>
        <button
          class=${styles.rowButton}
          type="button"
          @click=${() => onToggle(item.id)}
          aria-expanded=${expanded}
        >
          <span class=${styles.name}>${applicant.full_name ?? "—"}</span>
          ${StatusChip.render({ status: item.status })}
          <span
            class=${expanded ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
          >
            ${MaterialIcon.render({ name: "keyboard_arrow_down", size: "lg" })}
          </span>
        </button>
        ${
          expanded
            ? html`
                <div class=${styles.expanded}>
                  <div class=${styles.links}>
                    ${
                      applicant.website
                        ? html`
                            <a
                              class=${styles.metaLink}
                              href=${applicant.website}
                              target="_blank"
                              rel="noopener"
                            >
                              ${MaterialIcon.render({ name: "globe", size: "lg" })}
                              <span>${applicant.website}</span>
                            </a>
                          `
                        : ""
                    }
                    ${
                      instagram
                        ? html`
                            <a
                              class=${styles.metaLink}
                              href=${`https://instagram.com/${instagram}`}
                              target="_blank"
                              rel="noopener"
                            >
                              ${MaterialIcon.render({ name: "photo_camera", size: "lg" })}
                              <span>@${instagram}</span>
                            </a>
                          `
                        : ""
                    }
                    ${
                      applicant.country
                        ? html`
                            <span class=${styles.metaRow}>
                              ${MaterialIcon.render({ name: "location_pin", size: "lg" })}
                              <span>${applicant.country}</span>
                            </span>
                          `
                        : ""
                    }
                  </div>
                  <p class=${styles.motivation}>${item.motivation}</p>
                  ${
                    (item.status === "pending" || item.status === "rejected") &&
                    !event_assigned
                      ? html`
                          <div class=${styles.actions}>
                            ${Button.render({
                              children: "Shortlist",
                              variant: "outline",
                              shape: "pill",
                              size: "md",
                              isDisabled: max_reached,
                              className: styles.softInfo,
                              onClick: () => onSelect(item.id),
                            })}
                            ${
                              item.status === "pending"
                                ? html`
                                    ${Button.render({
                                      children: "Reject",
                                      color: "error",
                                      variant: "outline",
                                      shape: "pill",
                                      size: "md",
                                      onClick: () => onReject(item.id),
                                    })}
                                  `
                                : html`
                                    ${Button.render({
                                      children: "Back to pending",
                                      variant: "outline",
                                      shape: "pill",
                                      size: "md",
                                      onClick: () => onUnreject(item.id),
                                    })}
                                  `
                            }
                          </div>
                        `
                      : ""
                  }
                  ${
                    item.status === "shortlisted" && !event_assigned
                      ? html`
                          ${
                            confirming_assign
                              ? ConfirmPrompt.render({
                                  id: "assign-confirm",
                                  message:
                                    "Assign this applicant as the winner? The event will close and the others will be rejected.",
                                  confirmLabel: "Yes, assign",
                                  busyLabel: "Assigning…",
                                  cancelLabel: "Keep shortlist",
                                  tone: "primary",
                                  isBusy: status === "saving",
                                  onConfirm: () => onAssign(item.id),
                                  onCancel: onCancelAssign,
                                })
                              : html`
                                  <div class=${styles.actions}>
                                    ${Button.render({
                                      children: "Assign winner",
                                      color: "primary",
                                      shape: "pill",
                                      size: "md",
                                      onClick: () => onAskAssign(item.id),
                                    })}
                                    ${Button.render({
                                      children: "Remove from shortlist",
                                      variant: "outline",
                                      shape: "pill",
                                      size: "md",
                                      onClick: () => onUnshortlist(item.id),
                                    })}
                                  </div>
                                `
                          }
                        `
                      : ""
                  }
                </div>
              `
            : ""
        }
      </article>
    `
  },
}

function deadlinePast(iso) {
  if (!iso) return false
  return new Date(iso).getTime() <= Date.now()
}

function formatDay(iso) {
  if (!iso) return "—"
  return new Date(`${iso}T00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDeadline(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function prettyValue(value) {
  if (!value) return "—"
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
