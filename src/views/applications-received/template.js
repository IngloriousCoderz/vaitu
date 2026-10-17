import { Alert } from "@inglorious/ui/alert"
import { Button } from "@inglorious/ui/button"
import { Card } from "@inglorious/ui/card"
import { Chip } from "@inglorious/ui/chip"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { MaterialIcon } from "@inglorious/ui/material-icon"
import { html } from "@inglorious/web"
import { getFieldError } from "@inglorious/web/form"

import { Page } from "../../common/page/index.js"
import { DATETIME_LOCAL_LENGTH, SINGULAR } from "../../constants/index.js"
import { capitalize } from "../../text/index.js"
import styles from "./style.module.css"

const StatusColors = {
  pending: "default",
  shortlisted: "info",
  selected: "success",
  rejected: "error",
}

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
    onBack,
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
          ${IconButton.render({
            icon: MaterialIcon.render({ name: "arrow_back", size: "lg" }),
            variant: "ghost",
            ariaLabel: "Back",
            onClick: onBack,
          })}

          <header class=${styles.header}>
            <span class=${styles.title}>${entity.event_title}</span>
            <p class=${styles.subtitle}>
              ${selected_count} shortlisted · ${items.length} received
            </p>
            ${
              entity.event_status === "assigned" ||
              entity.event_status === "closed"
                ? html`
                    ${
                      entity.confirming_reopen
                        ? html`
                            <p class=${styles.warn}>
                              ${
                                entity.event_status === "assigned"
                                  ? "Reopen this event? Applications keep their status and you can adjust the shortlist again."
                                  : "Reopen this event? New applications will be accepted again."
                              }
                            </p>
                            ${
                              deadlinePast(entity.event_deadline)
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
                                : ""
                            }
                            <div class=${styles.actions}>
                              ${Button.render({
                                children:
                                  status === "saving"
                                    ? "Reopening…"
                                    : "Yes, reopen",
                                color: "primary",
                                shape: "pill",
                                size: "md",
                                isDisabled:
                                  status === "saving" ||
                                  (deadlinePast(entity.event_deadline) &&
                                    (entity.reopen_deadline ?? "").length !==
                                      DATETIME_LOCAL_LENGTH),
                                onClick: onReopen,
                              })}
                              ${Button.render({
                                children:
                                  entity.event_status === "assigned"
                                    ? "Keep assigned"
                                    : "Keep closed",
                                variant: "outline",
                                shape: "pill",
                                size: "md",
                                onClick: onCancelReopen,
                              })}
                            </div>
                          `
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
              status === "loading"
                ? html`<p class=${styles.empty}>Loading applications…</p>`
                : status === "error" && !items.length
                  ? html`<p class=${styles.empty}>${error}</p>`
                  : !items.length
                    ? html`<p class=${styles.empty}>
                        ${
                          entity.event_status === "open"
                            ? "No applications yet."
                            : "No applications received."
                        }
                      </p>`
                    : items.map((item) =>
                        this.renderApplicant({
                          item,
                          expanded: entity.expanded_application_id === item.id,
                          max_reached,
                          confirming_assign:
                            entity.confirming_assign === item.id,
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
            ${
              status === "error" && items.length >= SINGULAR
                ? Alert.render({
                    severity: "error",
                    className: `vaitu-alert ${styles.error}`,
                    children: error,
                  })
                : ""
            }
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
      ["Created", formatDay((recap.created_at ?? "").slice(0, 10))],
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
          ${Chip.render({
            children: capitalize(item.status),
            color: StatusColors[item.status] ?? "default",
          })}
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
                              ? html`
                                  <p id="assign-confirm" class=${styles.warn}>
                                    Assign this applicant as the winner? The
                                    event will close and the others will be
                                    rejected.
                                  </p>
                                  <div class=${styles.actions}>
                                    ${Button.render({
                                      children:
                                        status === "saving"
                                          ? "Assigning…"
                                          : "Yes, assign",
                                      color: "primary",
                                      shape: "pill",
                                      size: "md",
                                      isDisabled: status === "saving",
                                      onClick: () => onAssign(item.id),
                                    })}
                                    ${Button.render({
                                      children: "Keep shortlist",
                                      variant: "outline",
                                      shape: "pill",
                                      size: "md",
                                      onClick: onCancelAssign,
                                    })}
                                  </div>
                                `
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
