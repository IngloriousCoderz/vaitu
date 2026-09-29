import { html } from "@inglorious/web"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"

import { renderCard } from "../event-card/index.js"
import { renderIcon } from "../icon/index.js"
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

export function renderBidDetail({
  entity,
  onField,
  onSave,
  onAskWithdraw,
  onWithdraw,
  onCancelWithdraw,
  onBack,
  onNavigate,
}) {
  const { bid, status, error } = entity
  const busy = status === "saving" || status === "withdrawing"
  const canSave = bid && entity.motivation.trim().length > 0 && !busy

  return html`
    <div class=${styles.page} data-category=${bid?.category ?? "wedding"}>
      <button class=${styles.back} type="button" @click=${onBack}>
        ${renderIcon({ name: "arrow-left", size: 16 })}
        <span>Back</span>
      </button>

      ${status === "loading"
        ? html`<p class=${styles.empty}>Loading application…</p>`
        : !bid
          ? html`<p class=${styles.empty}>${error}</p>`
          : html`
              ${renderCard({ event: bid })}
              <div class=${styles.statusRow}>
                ${Chip.render({
                  children: statusLabel(bid.application_status),
                  color: statusColors[bid.application_status] ?? "default",
                })}
              </div>

              <h3 class=${styles.sectionTitle}>Your motivation</h3>
              <label class=${styles.field}>
                <textarea
                  rows="5"
                  .value=${entity.motivation}
                  @input=${(e) =>
                    onField({ field: "motivation", value: e.target.value })}
                ></textarea>
              </label>
              ${Button.render({
                children: status === "saving" ? "Saving…" : "Save changes",
                color: "primary",
                shape: "pill",
                size: "md",
                isFullWidth: true,
                isDisabled: !canSave,
                onClick: () => {
                  if (canSave) onSave()
                },
              })}
              ${error && status !== "loading"
                ? html`<p class=${styles.error}>${error}</p>`
                : ""}

              ${entity.confirming_withdraw
                ? html`
                    <p class=${styles.warn}>
                      Withdraw this application? The organizer will no longer
                      see it.
                    </p>
                    <div class=${styles.withdrawRow}>
                      ${Button.render({
                        children:
                          status === "withdrawing"
                            ? "Withdrawing…"
                            : "Yes, withdraw",
                        color: "error",
                        shape: "pill",
                        size: "md",
                        isFullWidth: true,
                        isDisabled: busy,
                        onClick: () => {
                          if (!busy) onWithdraw()
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
                      variant: "outline",
                      shape: "pill",
                      size: "md",
                      isFullWidth: true,
                      onClick: onAskWithdraw,
                    })}
                  `}
            `}
      ${renderTabbar({ active: "applications", onNavigate })}
    </div>
  `
}
