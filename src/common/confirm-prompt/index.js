import { Button } from "@inglorious/ui/button"
import { html } from "@inglorious/web"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

// The inline "are you sure?" step before an action that is hard to take back:
// a message, anything the action needs (`children`, such as a field), then
// the confirm and cancel buttons. `tone` is "danger" for destructive actions
// and "primary" for ones that move things forward. `isStacked` puts the
// buttons one above the other at full width. `id` goes on the message, so a
// page can scroll the prompt into view.
export const ConfirmPrompt = {
  render({
    id,
    message,
    children = "",
    confirmLabel,
    busyLabel = confirmLabel,
    cancelLabel = t("common.keepIt"),
    tone = "danger",
    isBusy = false,
    isDisabled = false,
    isStacked = false,
    className = "",
    onConfirm,
    onCancel,
  }) {
    const isDanger = tone === "danger"
    return html`<div class="${styles.prompt} ${className}">
      ${
        id
          ? html`<p id=${id} class=${styles.message}>${message}</p>`
          : html`<p class=${styles.message}>${message}</p>`
      }
      ${children}
      <div class="${styles.actions} ${isStacked ? styles.stacked : ""}">
        ${Button.render({
          children: isBusy ? busyLabel : confirmLabel,
          color: isDanger ? "error" : "primary",
          variant: isDanger ? "outline" : "default",
          shape: "pill",
          size: "md",
          isFullWidth: isStacked,
          isDisabled: isBusy || isDisabled,
          onClick: () => {
            if (!isBusy && !isDisabled) onConfirm()
          },
        })}
        ${Button.render({
          children: cancelLabel,
          variant: "outline",
          shape: "pill",
          size: "md",
          isFullWidth: isStacked,
          onClick: onCancel,
        })}
      </div>
    </div>`
  },
}
