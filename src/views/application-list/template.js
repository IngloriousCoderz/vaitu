import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { MaterialIcon } from "@inglorious/ui/material-icon"
import { html } from "@inglorious/web"

import { Card } from "../../common/event-card/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { StatusChip } from "../../common/status-chip/index.js"
import { LIST_STAGGER_CAP } from "../../constants/index.js"
import styles from "./style.module.css"

const FilterOptions = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "selected", label: "Selected" },
  { id: "rejected", label: "Rejected" },
]

export const ApplicationList = {
  render(props, api) {
    return this.renderApplicationList(props, api)
  },

  renderApplicationList({ entity, onOpenEvent, onSelectStatus }) {
    const { applications, status_filter, status, error } = entity
    const shown =
      status_filter === "all"
        ? applications
        : applications.filter((a) => a.applicationStatus === status_filter)

    return Page.render({
      variant: "sticky",
      wide: true,
      children: [
        html`
          <div class=${styles.stickyTop}>
            <header class=${styles.header}>
              <span class=${styles.title}>My Applications</span>
            </header>

            <div class=${styles.chips}>
              ${FilterOptions.map(
                (option) => html`
                  <button
                    type="button"
                    class=${styles.chipButton}
                    @click=${() => onSelectStatus(option.id)}
                  >
                    ${Chip.render({
                      children: option.label,
                      color:
                        option.id === status_filter ? "primary" : "default",
                    })}
                  </button>
                `,
              )}
            </div>
          </div>

          <main class="${styles.list} vaitu-list">
            ${
              PageStatus.render({
                isError: status === "error",
                error,
                isLoading: status === "loading",
                loadingText: "Loading applications…",
                isEmpty: !shown.length,
                emptyText: !applications.length
                  ? "You haven't applied for any event yet."
                  : "Nothing with this status.",
              }) ??
              shown.map((application, index) =>
                this.renderApplicationItem({
                  application,
                  onOpenEvent,
                  index,
                }),
              )
            }
          </main>
        `,
      ],
    })
  },

  renderApplicationItem({ application, onOpenEvent, index }) {
    const isWinner = application.applicationStatus === "selected"
    const itemClass = [
      styles.application,
      isWinner ? styles.winner : "",
      "vaitu-list-item",
    ]
      .filter(Boolean)
      .join(" ")
    return Flex.render({
      direction: "column",
      className: itemClass,
      style: `--vaitu-list-index:${Math.min(index, LIST_STAGGER_CAP)}`,
      children: [
        Card.render({
          event: application,
          divider: false,
          cover: true,
          onOpen: onOpenEvent,
        }),
        html`
          <div class=${styles.applicationFooter}>
            ${
              isWinner
                ? html`<span class=${styles.winnerTrophy}>
                    ${MaterialIcon.render({ name: "trophy", size: "lg" })}
                  </span>`
                : StatusChip.render({ status: application.applicationStatus })
            }
          </div>
        `,
      ],
    })
  },
}
