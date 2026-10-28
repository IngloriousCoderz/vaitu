import deleteOutline from "@iconify-icons/material-symbols/delete-outline"
import editOutline from "@iconify-icons/material-symbols/edit-outline"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { ConfirmPrompt } from "../../common/confirm-prompt/index.js"
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

    return Page.render({
      variant: "sticky",
      wide: true,
      children: [
        html`
          <main class="${styles.list} vaitu-list">
            ${
              PageStatus.render({
                isError: status === "error",
                error,
                isLoading: status === "loading",
                isEmpty: !events.length,
                emptyText: t("myEvents.none"),
              }) ??
              events.map((event, index) =>
                this.renderMyEvent({
                  event,
                  style: `--vaitu-list-index:${Math.min(index, LIST_STAGGER_CAP)}`,
                  isConfirmingDelete: confirmingDelete === event.id,
                  onOpenEvent,
                  onEdit,
                  onAskDelete,
                  onDelete,
                  onCancelDelete,
                }),
              )
            }
          </main>
        `,
      ],
    })
  },

  renderMyEvent({
    event,
    style,
    isConfirmingDelete,
    onOpenEvent,
    onEdit,
    onAskDelete,
    onDelete,
    onCancelDelete,
  }) {
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
        when(isConfirmingDelete, () =>
          ConfirmPrompt.render({
            message: t("myEvents.deleteConfirm"),
            confirmLabel: t("myEvents.yesDelete"),
            className: styles.confirm,
            onConfirm: () => onDelete(event.id),
            onCancel: onCancelDelete,
          }),
        ),
      ],
    })
  },
}
