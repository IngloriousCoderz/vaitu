import closeOutline from "@iconify-icons/material-symbols/close-outline"
import { Button } from "@inglorious/ui/button"
import { Dialog } from "@inglorious/ui/dialog"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { html } from "@inglorious/web"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

// The one-row pill that rises when a new version is fully downloaded: move
// over now, or pick when. `onRefresh` reloads; `onDismiss` opens the dialog —
// the update will land on the next time the app opens either way, so there is
// nothing to refuse, only a moment to choose. `isReadyFrom` distinguishes the
// claim of a first-ever worker (nothing to move to) from the claim of one
// that replaces another: only that one rises.
export const UpdateBar = {
  render({ isDismissed, onRefresh, onDismiss }) {
    if (isDismissed) return ""
    return html`<aside class=${styles.bar} role="status">
      ${Flex.render({
        direction: "row",
        align: "center",
        // Tight between the action pair; the message buys its own extra
        // room in .message, so "Update now + ✕" read as one clustered group.
        gap: "sm",
        className: styles.row,
        children: [
          html`<span class=${styles.message}>${t("pwa.updateReady")}</span>`,
          Button.render({
            children: t("pwa.refresh"),
            variant: "primary",
            shape: "pill",
            size: "sm",
            onClick: onRefresh,
          }),
          IconButton.render({
            icon: Icon.render({ icon: closeOutline, size: "md" }),
            ariaLabel: t("pwa.dismiss"),
            variant: "ghost",
            color: "secondary",
            onClick: onDismiss,
          }),
        ],
      })}
    </aside>`
  },
}

// The moment picker behind the X: there is no "no" to the update — the next
// time the app opens lands on the new version regardless — only "now" or
// "next time". The backdrop click is the way out without choosing, and keeps
// the pill as it was.
export const UpdateDialog = {
  render({ isOpen, onRefresh, onDefer, onClose }) {
    return Dialog.render({
      isOpen,
      description: t("pwa.deferQuestion"),
      actions: html`
        ${Button.render({
          children: t("pwa.defer"),
          variant: "outline",
          size: "sm",
          onClick: onDefer,
        })}
        ${Button.render({
          children: t("pwa.refresh"),
          variant: "primary",
          size: "sm",
          onClick: onRefresh,
        })}
      `,
      // No onClose: the two buttons ARE the answers, and the house dialog
      // renders a lonely header × whenever it gets one — the backdrop is
      // the way out without choosing.
      onBackdropClick: onClose,
    })
  },
}
