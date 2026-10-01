import { html } from "@inglorious/web"
import { Chip } from "@inglorious/ui/chip"

import { renderCard } from "../event-card/index.js"
import styles from "./style.module.css"

const statusColors = {
  pending: "default",
  shortlisted: "info",
  selected: "success",
  rejected: "error",
}

const filterOptions = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "selected", label: "Selected" },
  { id: "rejected", label: "Rejected" },
]

function statusLabel(status) {
  return status[0].toUpperCase() + status.slice(1)
}

function renderApplication({ application, onOpenEvent }) {
  return html`
    <div class=${styles.application}>
      ${renderCard({ event: application, divider: false, onOpen: onOpenEvent })}
      <div class=${styles.applicationFooter}>
        ${Chip.render({
          children: statusLabel(application.applicationStatus),
          color: statusColors[application.applicationStatus] ?? "default",
        })}
      </div>
    </div>
  `
}

export function renderApplications({ entity, onOpenEvent, onSelectStatus }) {
  const { applications, status_filter, status, error } = entity
  const shown =
    status_filter === "all"
      ? applications
      : applications.filter((a) => a.applicationStatus === status_filter)

  return html`
    <div class=${styles.page} data-category="wedding">
      <header class=${styles.header}>
        <span class=${styles.title}>My Applications</span>
      </header>

      <div class=${styles.chips}>
        ${filterOptions.map(
          (option) => html`
            <button
              type="button"
              class=${styles.chipButton}
              @click=${() => onSelectStatus(option.id)}
            >
              ${Chip.render({
                children: option.label,
                color: option.id === status_filter ? "primary" : "default",
              })}
            </button>
          `,
        )}
      </div>

      <main class=${styles.list}>
        ${status === "loading"
          ? html`<p class=${styles.empty}>Loading applications…</p>`
          : status === "error"
            ? html`<p class=${styles.empty}>${error}</p>`
            : shown.length === 0
              ? html`<p class=${styles.empty}>
                  ${applications.length === 0
                    ? "You haven't applied for any event yet."
                    : "Nothing with this status."}
                </p>`
              : shown.map((application) =>
                  renderApplication({ application, onOpenEvent }),
                )}
      </main>
    </div>
  `
}
