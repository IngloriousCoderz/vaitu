import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { html } from "@inglorious/web"

import { capitalize } from "../../text.js"
import { renderCard } from "../event-card/index.js"
import { renderIcon } from "../icon/index.js"
import { renderTabbar } from "../tab-bar/template.js"
import styles from "./style.module.css"

const statusColors = {
  pending: "default",
  selected: "success",
  rejected: "error",
}

export function renderApplicationDetail({
  entity,
  onField,
  onSave,
  onAskWithdraw,
  onWithdraw,
  onCancelWithdraw,
  onBack,
  onNavigate,
}) {
  const { application, status, error } = entity
  const isBusy = status === "saving" || status === "withdrawing"
  const canSave =
    application && entity.motivation.trim() !== "" && !isBusy

  return html`
    <div class=${styles.page} data-category=${application?.category ?? "wedding"}>
      <button class=${styles.back} type="button" @click=${onBack}>
        ${renderIcon({ name: "arrow-left", size: 16 })}
        <span>Back</span>
      </button>

      ${status === "loading"
        ? html`<p class=${styles.empty}>Loading application…</p>`
        : !application
          ? html`<p class=${styles.empty}>${error}</p>`
          : html`
              ${renderCard({ event: application })}
              <div class=${styles.statusRow}>
                ${Chip.render({
                  children: capitalize(application.applicationStatus),
                  color: statusColors[application.applicationStatus] ?? "default",
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
                className: styles.saveButton,
                onClick: () => {
                  if (canSave) onSave()
                },
              })}
              ${error && status !== "loading"
                ? html`<p class=${styles.error}>${error}</p>`
                : ""}

              ${entity.isConfirmingWithdraw
                ? html`
                    <p class=${styles.warn}>
                      Are you sure you want to withdraw your application?
                      The organizer will no longer see it.
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
                  `}
            `}
      ${renderTabbar({ active: "applications", onNavigate })}
    </div>
  `
}
