import deleteOutline from "@iconify-icons/material-symbols/delete-outline"
import editOutline from "@iconify-icons/material-symbols/edit-outline"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { ConfirmDialog } from "../../common/confirm-dialog/index.js"
import { Card } from "../../common/job-card/index.js"
import { LoadStatus } from "../../common/load-status/index.js"
import { Page } from "../../common/page/index.js"
import { StatusChip } from "../../common/status-chip/index.js"
import { LIST_STAGGER_CAP } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

export const template = {
  render(props, api) {
    return this.renderMyJobs(props, api)
  },

  renderMyJobs({
    entity,
    onOpenJob,
    onEdit,
    onAskDelete,
    onDelete,
    onCancelDelete,
  }) {
    const { jobs, confirmingDelete, status, error, removeStatus, removeError } =
      entity
    const isConfirmingDelete = confirmingDelete != null

    return Page.render({
      variant: "sticky",
      wide: true,
      children: [
        html`
          <main class="${styles.list} vaitu-list">
            ${LoadStatus.render({
              isError: status === "error",
              error,
              isLoading: status === "loading" && !jobs.length,
              isEmpty: !jobs.length,
              emptyText: t("myJobs.none"),
              content: () =>
                jobs.map((job, index) =>
                  this.renderMyJob({
                    job,
                    style: `--vaitu-list-index:${Math.min(index, LIST_STAGGER_CAP)}`,
                    onOpenJob,
                    onEdit,
                    onAskDelete,
                  }),
                ),
            })}
          </main>
        `,
        ConfirmDialog.render({
          id: "delete-job-confirm",
          isOpen: isConfirmingDelete,
          message: t("myJobs.deleteConfirm"),
          error: removeError,
          confirmLabel: t("myJobs.yesDelete"),
          isBusy: removeStatus === "loading",
          onConfirm: () => onDelete(confirmingDelete),
          onCancel: onCancelDelete,
        }),
      ],
    })
  },

  renderMyJob({ job, style, onOpenJob, onEdit, onAskDelete }) {
    return Flex.render({
      direction: "column",
      className: `${styles.myJob} vaitu-list-item`,
      style,
      children: [
        Card.render({
          job,
          divider: false,
          cover: true,
          onOpen: onOpenJob,
        }),
        html`
          <div class=${styles.myJobFooter}>
            ${StatusChip.render({ status: job.status })}
            <span class=${styles.count}>
              ${t("myJobs.applications", { count: job.applications_count })}
            </span>
            <span class=${styles.rowActions}>
              ${when(job.status === "open", () =>
                IconButton.render({
                  icon: Icon.render({ icon: editOutline, size: "lg" }),
                  ariaLabel: t("myJobs.edit"),
                  variant: "ghost",
                  color: "primary",
                  shape: "round",
                  onClick: () => onEdit(job.id),
                }),
              )}
              ${IconButton.render({
                icon: Icon.render({ icon: deleteOutline, size: "lg" }),
                ariaLabel: t("myJobs.delete"),
                variant: "ghost",
                color: "error",
                shape: "round",
                onClick: () => onAskDelete(job.id),
              })}
            </span>
          </div>
        `,
      ],
    })
  },
}
