import { Button } from "@inglorious/ui/button"
import { Dialog } from "@inglorious/ui/dialog"
import { html } from "@inglorious/web"

import { t } from "../../i18n/index.js"
import { ErrorAlert } from "../error-alert/index.js"
import styles from "./style.module.css"

// The "are you sure?" step before an action that is hard to take back, as a
// sheet: on a phone it rises from the bottom edge, from 48rem it is a centred
// dialog. It is modal, so the page waits behind it and focus goes back to the
// button that opened it: the page keeps that button and only flips `isOpen`.
//
// A message, anything the action needs (`children`, such as a field), the
// action's error when it failed (the page behind is out of sight), then the
// confirm and cancel buttons. `tone` is "danger" for destructive actions and
// "primary" for ones that move things forward. Esc, the backdrop and the close
// button all cancel, except while the action runs.
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
