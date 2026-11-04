import flagOutline from "@iconify-icons/material-symbols/flag-outline"
import { Button } from "@inglorious/ui/button"
import { Dialog } from "@inglorious/ui/dialog"
import { Icon } from "@inglorious/ui/icon"
import { RadioGroup } from "@inglorious/ui/radio-group"
import { Textarea } from "@inglorious/ui/textarea"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { SAFETY_REASONS } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { ErrorAlert } from "../error-alert/index.js"
import styles from "./style.module.css"

export const template = {
  render(props) {
    return this.renderSafety(props)
  },

  renderSafety({
    isOpen,
    status,
    reason,
    details,
    error,
    isConfirmingBlock,
    canBlock,
    onClose,
    onFieldSet,
    onReport,
    onBlockAsk,
    onBlock,
    onBlockCancel,
  }) {
    if (!isOpen) return ""
    const isBusy = status === "sending"
    return Dialog.render({
      id: "safety",
      isOpen: true,
      size: "sm",
      title: t("safety.title"),
      closeLabel: t("common.close"),
      onClose,
      children: when(
        status === "sent",
        () => html`<p role="status">${t("safety.thanks")}</p>`,
        () =>
          when(
            isConfirmingBlock,
            () =>
              html`<p>${t("safety.blockConfirm")}</p>
                ${ErrorAlert.render({ error })}`,
            () => html`
              <div class=${styles.form}>
                ${RadioGroup.render({
                  id: "safety-reason",
                  label: t("safety.reasonLabel"),
                  value: reason,
                  options: SAFETY_REASONS.map((value) => ({
                    value,
                    label: t(`safety.reasons.${value}`),
                  })),
                  onChange: (value) => onFieldSet("reason", value),
                })}
                ${Textarea.render({
                  id: "safety-details",
                  label: t("safety.detailsLabel"),
                  value: details,
                  rows: 3,
                  isFullWidth: true,
                  onChange: (value) => onFieldSet("details", value),
                })}
                ${ErrorAlert.render({ error })}
              </div>
            `,
          ),
      ),
      actions: when(
        status === "sent",
        () =>
          Button.render({
            children: t("common.close"),
            variant: "outline",
            shape: "pill",
            size: "md",
            isFullWidth: true,
            onClick: onClose,
          }),
        () =>
          when(
            isConfirmingBlock,
            () =>
              html`<div class=${styles.actions}>
                ${Button.render({
                  children: t("safety.yesBlock"),
                  color: "error",
                  variant: "outline",
                  shape: "pill",
                  size: "md",
                  isDisabled: isBusy,
                  onClick: onBlock,
                })}
                ${Button.render({
                  children: t("common.cancel"),
                  variant: "outline",
                  shape: "pill",
                  size: "md",
                  onClick: onBlockCancel,
                })}
              </div>`,
            () =>
              html`<div class=${styles.actions}>
                ${Button.render({
                  children: isBusy ? t("common.saving") : t("safety.send"),
                  color: "primary",
                  shape: "pill",
                  size: "md",
                  isDisabled: isBusy,
                  onClick: onReport,
                })}
                ${when(canBlock, () =>
                  Button.render({
                    children: t("safety.block"),
                    color: "error",
                    variant: "ghost",
                    shape: "pill",
                    size: "md",
                    onClick: onBlockAsk,
                  }),
                )}
              </div>`,
          ),
      ),
    })
  },
}

export const SafetyButton = {
  /** @param {{ onClick: () => void, label?: string }} props */
  render({ onClick, label = t("safety.open") }) {
    return Button.render({
      children: html`<span class=${styles.trigger}
        >${Icon.render({ icon: flagOutline, size: "sm" })} ${label}</span
      >`,
      variant: "ghost",
      color: "default",
      size: "sm",
      onClick,
    })
  },
}
