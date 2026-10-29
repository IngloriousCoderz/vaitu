import deleteOutline from "@iconify-icons/material-symbols/delete-outline"
import editOutline from "@iconify-icons/material-symbols/edit-outline"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { ConfirmDialog } from "../../common/confirm-dialog/index.js"
import { Card } from "../../common/event-card/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { StatusChip } from "../../common/status-chip/index.js"
import { LIST_STAGGER_CAP } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

export const MyEvents = {
  render(props, api) {
    return this.renderMyEvents(props, api)
  },

  renderMyEvents({
    entity,
    onOpenEvent,
    onEdit,
    onAskDelete,
    onDelete,
    onCancelDelete,
  }) {
    const { events, confirmingDelete, status, error } = entity
    const isConfirmingDelete = confirmingDelete != null

    return Page.render({
      variant: "sticky",
      wide: true,
      children: [
        html`
          <main class="${styles.list} vaitu-list">
            ${
              PageStatus.render({
                // A failed delete is the dialog's to show: the list stays.
                isError: status === "error" && !isConfirmingDelete,
                error,
                isLoading: status === "loading",
                isEmpty: !events.length,
                emptyText: t("myEvents.none"),
              }) ??
              events.map((event, index) =>
                this.renderMyEvent({
                  event,
                  style: `--vaitu-list-index:${Math.min(index, LIST_STAGGER_CAP)}`,
                  onOpenEvent,
                  onEdit,
                  onAskDelete,
                }),
              )
            }
          </main>
        `,
        ConfirmDialog.render({
          id: "delete-event-confirm",
          isOpen: isConfirmingDelete,
          message: t("myEvents.deleteConfirm"),
          error: isConfirmingDelete && status === "error" ? error : null,
          confirmLabel: t("myEvents.yesDelete"),
          isBusy: status === "saving",
          onConfirm: () => onDelete(confirmingDelete),
          onCancel: onCancelDelete,
        }),
      ],
    })
  },

  renderMyEvent({ event, style, onOpenEvent, onEdit, onAskDelete }) {
    return Flex.render({
      direction: "column",
      className: `${styles.myEvent} vaitu-list-item`,
      style,
      children: [
        Card.render({
          event,
          divider: false,
          cover: true,
          onOpen: onOpenEvent,
        }),
        html`
          <div class=${styles.myEventFooter}>
            ${StatusChip.render({ status: event.status })}
            <span class=${styles.count}>
              ${t("myEvents.applications", { count: event.applications_count })}
            </span>
            <span class=${styles.rowActions}>
              ${when(event.status === "open", () =>
                IconButton.render({
                  icon: Icon.render({ icon: editOutline, size: "lg" }),
                  ariaLabel: t("myEvents.edit"),
                  variant: "ghost",
                  color: "primary",
                  shape: "round",
                  onClick: () => onEdit(event.id),
                }),
              )}
              ${IconButton.render({
                icon: Icon.render({ icon: deleteOutline, size: "lg" }),
                ariaLabel: t("myEvents.delete"),
                variant: "ghost",
                color: "error",
                shape: "round",
                onClick: () => onAskDelete(event.id),
              })}
            </span>
          </div>
        `,
      ],
    })
  },
}
