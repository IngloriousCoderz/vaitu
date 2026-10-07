import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { html } from "@inglorious/web"

import { SINGULAR } from "../../constants.js"
import { capitalize } from "../../text.js"
import { renderIcon } from "../icon/index.js"
import styles from "./style.module.css"

const statusColors = {
  pending: "default",
  shortlisted: "info",
  selected: "success",
  rejected: "error",
}

function renderApplicant({
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
  const instagram = (applicant.instagram_handle ?? "").trim().replace(/^@+/, "")
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
          color: statusColors[item.status] ?? "default",
        })}
        <span
          class=${expanded ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
        >
          ${renderIcon({ name: "chevron-down", size: 18 })}
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
                            ${renderIcon({ name: "globe", size: 14 })}
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
                            ${renderIcon({ name: "instagram", size: 14 })}
                            <span>@${instagram}</span>
                          </a>
                        `
                      : ""
                  }
                  ${
                    applicant.country
                      ? html`
                          <span class=${styles.metaRow}>
                            ${renderIcon({ name: "map-pin", size: 14 })}
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
                            color: "primary",
                            shape: "pill",
                            size: "md",
                            isDisabled: max_reached,
                            onClick: () => onSelect(item.id),
                          })}
                          ${
                            item.status === "pending"
                              ? html`
                                  ${Button.render({
                                    children: "Reject",
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
                                  Assign this applicant as the winner? The event
                                  will close and the others will be rejected.
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
                                ${Button.render({
                                  children: "Assign winner",
                                  variant: "outline",
                                  shape: "pill",
                                  size: "md",
                                  isFullWidth: true,
                                  onClick: () => onAskAssign(item.id),
                                })}
                                ${Button.render({
                                  children: "Remove from shortlist",
                                  variant: "ghost",
                                  shape: "pill",
                                  size: "md",
                                  isFullWidth: true,
                                  onClick: () => onUnshortlist(item.id),
                                })}
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
}

export function renderReceived({
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
  onReopen,
  onCancelReopen,
  onBack,
}) {
  const { items, status, error } = entity
  const selected_count = items.filter((i) => i.status === "shortlisted").length
  const max_reached =
    entity.max_applicants != null && selected_count >= entity.max_applicants

  return html`
    <div class=${styles.page} data-category="wedding">
      <button class=${styles.back} type="button" @click=${onBack}>
        ← Back
      </button>

      <header class=${styles.header}>
        <span class=${styles.title}>${entity.event_title}</span>
        <p class=${styles.subtitle}>
          ${selected_count} shortlisted · ${items.length} received
        </p>
        ${
          entity.event_status === "assigned"
            ? html`
                ${
                  entity.confirming_reopen
                    ? html`
                        <p class=${styles.warn}>
                          Reopen this event? Applications keep their status and
                          you can adjust the shortlist again.
                        </p>
                        <div class=${styles.actions}>
                          ${Button.render({
                            children:
                              status === "saving"
                                ? "Reopening…"
                                : "Yes, reopen",
                            color: "primary",
                            shape: "pill",
                            size: "md",
                            isDisabled: status === "saving",
                            onClick: onReopen,
                          })}
                          ${Button.render({
                            children: "Keep assigned",
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
                          variant: "outline",
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

      <main class=${styles.list}>
        ${
          status === "loading"
            ? html`<p class=${styles.empty}>Loading applications…</p>`
            : status === "error" && !items.length
              ? html`<p class=${styles.empty}>${error}</p>`
              : !items.length
                ? html`<p class=${styles.empty}>No applications yet.</p>`
                : items.map((item) =>
                    renderApplicant({
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
        ${
          status === "error" && items.length >= SINGULAR
            ? html`<p class=${styles.error}>${error}</p>`
            : ""
        }
      </main>
    </div>
  `
}
