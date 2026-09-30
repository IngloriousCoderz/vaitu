import { html } from "@inglorious/web"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"

import styles from "./style.module.css"

const statusColors = {
  pending: "default",
  selected: "success",
  rejected: "error",
}

function statusLabel(status) {
  return status[0].toUpperCase() + status.slice(1)
}

function renderApplicant({ item, max_reached, onSelect, onReject }) {
  const applicant = item.applicant ?? {}
  const instagram = (applicant.instagram_handle ?? "").trim().replace(/^@+/, "")
  return html`
    <article class=${styles.card}>
      <div class=${styles.topRow}>
        <h2 class=${styles.name}>${applicant.full_name ?? "—"}</h2>
        ${Chip.render({
          children: statusLabel(item.status),
          color: statusColors[item.status] ?? "default",
        })}
      </div>
      <p class=${styles.meta}>
        ${applicant.website
          ? html`
              <a
                class=${styles.metaLink}
                href=${applicant.website}
                target="_blank"
                rel="noopener"
              >
                ${applicant.website}
              </a>
            `
          : ""}
        ${applicant.website && instagram ? html`<span> • </span>` : ""}
        ${instagram
          ? html`
              <a
                class=${styles.metaLink}
                href=${`https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener"
              >
                @${instagram}
              </a>
            `
          : ""}
        ${applicant.country ? html`<span> • ${applicant.country}</span>` : ""}
      </p>
      <p class=${styles.motivation}>${item.motivation}</p>
      ${item.status === "pending"
        ? html`
            <div class=${styles.actions}>
              ${Button.render({
                children: "Select",
                color: "primary",
                shape: "pill",
                size: "md",
                isDisabled: max_reached,
                onClick: () => onSelect(item.id),
              })}
              ${Button.render({
                children: "Reject",
                variant: "outline",
                shape: "pill",
                size: "md",
                onClick: () => onReject(item.id),
              })}
            </div>
          `
        : ""}
    </article>
  `
}

export function renderReceived({ entity, onSelect, onReject, onBack }) {
  const { items, status, error } = entity
  const selected_count = items.filter((i) => i.status === "selected").length
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
          ${selected_count} selected · ${items.length} received
        </p>
      </header>

      <main class=${styles.list}>
        ${status === "loading"
          ? html`<p class=${styles.empty}>Loading applications…</p>`
          : status === "error" && items.length === 0
            ? html`<p class=${styles.empty}>${error}</p>`
            : items.length === 0
              ? html`<p class=${styles.empty}>No applications yet.</p>`
              : items.map((item) =>
                  renderApplicant({ item, max_reached, onSelect, onReject }),
                )}
        ${status === "error" && items.length > 0
          ? html`<p class=${styles.error}>${error}</p>`
          : ""}
      </main>
    </div>
  `
}
