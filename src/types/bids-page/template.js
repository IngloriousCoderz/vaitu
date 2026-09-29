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

function renderBid({ bid, onOpenEvent }) {
  return html`
    <div class=${styles.bid}>
      ${renderCard({ event: bid, onOpen: onOpenEvent })}
      <div class=${styles.bidFooter}>
        ${Chip.render({
          children: statusLabel(bid.application_status),
          color: statusColors[bid.application_status] ?? "default",
        })}
      </div>
    </div>
  `
}

export function renderBids({ entity, onOpenEvent, onNavigate }) {
  const { bids, status, error } = entity

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
            : bids.length === 0
              ? html`<p class=${styles.empty}>
                  You haven't applied for any event yet.
                </p>`
              : bids.map((bid) => renderBid({ bid, onOpenEvent }))}
      </main>

      ${renderTabbar({ active: "applications", onNavigate })}
    </div>
  `
}
