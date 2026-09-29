import { html } from "@inglorious/web"
import { Chip } from "@inglorious/ui/chip"

import { renderCard } from "../event-card/index.js"
import { renderTabbar } from "../tab-bar/template.js"
import styles from "./style.module.css"

const statusColors = {
  pending: "default",
  selected: "success",
  rejected: "error",
}

function statusLabel(status) {
  return status[0].toUpperCase() + status.slice(1)
}

function renderApplication({ application, onOpenEvent }) {
  return html`
    <div class=${styles.application}>
      ${renderCard({ event: application, onOpen: onOpenEvent })}
      <div class=${styles.applicationFooter}>
        ${Chip.render({
          children: statusLabel(application.application_status),
          color: statusColors[application.application_status] ?? "default",
        })}
      </div>
    </div>
  `
}

export function renderApplications({ entity, onOpenEvent, onNavigate }) {
  const { applications, status, error } = entity

  return html`
    <div class=${styles.page} data-category="wedding">
      <header class=${styles.header}>
        <span class=${styles.title}>My Applications</span>
      </header>

      <main class=${styles.list}>
        ${status === "loading"
          ? html`<p class=${styles.empty}>Loading applications…</p>`
          : status === "error"
            ? html`<p class=${styles.empty}>${error}</p>`
            : applications.length === 0
              ? html`<p class=${styles.empty}>
                  You haven't applied for any event yet.
                </p>`
              : applications.map((application) => renderApplication({ application, onOpenEvent }))}
      </main>

      ${renderTabbar({ active: "applications", onNavigate })}
    </div>
  `
}
