import trophyOutline from "@iconify-icons/material-symbols/trophy-outline"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { html } from "@inglorious/web"

import { Card } from "../../common/event-card/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { StatusChip } from "../../common/status-chip/index.js"
import { LIST_STAGGER_CAP } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { labelled } from "../../i18n/index.js"
import styles from "./style.module.css"

const FilterOptions = [
  labelled("status.all", { id: "all" }),
  labelled("status.pending", { id: "pending" }),
  labelled("status.shortlisted", { id: "shortlisted" }),
  labelled("status.selected", { id: "selected" }),
  labelled("status.rejected", { id: "rejected" }),
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
                loadingText: t("applications.loading"),
                isEmpty: !shown.length,
                emptyText: !applications.length
                  ? t("applications.none")
                  : t("applications.noneWithStatus"),
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
                    ${Icon.render({ icon: trophyOutline, size: "lg" })}
                  </span>`
                : StatusChip.render({ status: application.applicationStatus })
            }
          </div>
        `,
      ],
    })
  },
}
