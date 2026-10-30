import { Button } from "@inglorious/ui/button"
import { Dialog } from "@inglorious/ui/dialog"
import { html } from "@inglorious/web"

import { t } from "../../i18n/index.js"
import { ErrorAlert } from "../error-alert/index.js"
import styles from "./style.module.css"

export const ConfirmDialog = {
  render({
    id,
    isOpen,
    message,
    children = "",
    error = null,
    confirmLabel,
    busyLabel = confirmLabel,
    cancelLabel = t("common.keepIt"),
    tone = "danger",
    isBusy = false,
    isDisabled = false,
    onConfirm,
    onCancel,
  }) {
    const isDanger = tone === "danger"
    return Dialog.render({
      id,
      isOpen,
      variant: "sheet",
      size: "sm",
      description: message,
      children:
        children || error
          ? html`${children}${ErrorAlert.render({ error })}`
          : "",
      actions: html`<div class=${styles.actions}>
        ${Button.render({
          children: isBusy ? busyLabel : confirmLabel,
          color: isDanger ? "error" : "primary",
          variant: isDanger ? "outline" : "default",
          shape: "pill",
          size: "md",
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
          isDisabled: isBusy,
          onClick: onCancel,
        })}
      </div>`,
      closeLabel: t("common.close"),
      onClose: isBusy ? undefined : onCancel,
    })
  },
}
